import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupportMapping, sendSupportCase } from "@/lib/support/ai-workforce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const safeText = (max: number) => z.string().trim().min(1).max(max);
const requestSchema = z.object({
  clientRequestId: z.string().uuid(),
  title: safeText(140),
  screen: safeText(160),
  path: z.string().trim().startsWith("/").max(500),
  attemptedAction: safeText(2000),
  errorMessage: safeText(2000),
  problemDescription: safeText(5000),
  occurredAt: z.string().datetime(),
  imageUrl: z.string().url().startsWith("https://").max(2000).optional().or(z.literal("")),
  technicalData: z.object({
    userAgent: z.string().max(1000).optional(),
    viewport: z.string().max(100).optional(),
    locale: z.string().max(50).optional(),
    timezone: z.string().max(100).optional(),
  }).strict().optional(),
}).strict();

function buildDescription(input: z.infer<typeof requestSchema>, context: {
  role: string;
  companyName?: string | null;
  unitName?: string | null;
}): string {
  const technical = input.technicalData
    ? Object.entries(input.technicalData).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("; ")
    : "não informado";

  return [
    input.problemDescription,
    "",
    `Tela: ${input.screen}`,
    `Caminho: ${input.path}`,
    `Ação tentada: ${input.attemptedAction}`,
    `Erro exibido: ${input.errorMessage}`,
    `Data/hora informada: ${input.occurredAt}`,
    `Perfil: ${context.role}`,
    `Empresa: ${context.companyName || "não vinculada"}`,
    `Unidade: ${context.unitName || "franqueadora/matriz"}`,
    `Dados técnicos seguros: ${technical}`,
    `Imagem: ${input.imageUrl || "não anexada"}`,
    "",
    "Este chamado é somente para diagnóstico. Nenhum reparo foi autorizado automaticamente.",
  ].join("\n");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha corretamente os dados do chamado." }, { status: 400 });
  }

  const input = parsed.data;
  const externalReference = `smarter-support:${input.clientRequestId}`;

  try {
    const existing = await prisma.supportCase.findUnique({ where: { externalReference } });
    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Referência de chamado inválida." }, { status: 409 });
    }
    if (existing?.status === "SENT" && existing.protocol) {
      return NextResponse.json({
        ok: true,
        created: false,
        protocol: existing.protocol,
        externalReference,
      }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        role: true,
        franchiseId: true,
        companyId: true,
        franchise: { select: { name: true, telefone: true, whatsapp: true } },
        company: { select: { name: true, telefone: true, franchiseId: true } },
        student: { select: { telefone: true, celular: true, franchiseId: true } },
        employee: { select: { franchiseId: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const franchiseId = user.franchiseId
      ?? user.company?.franchiseId
      ?? user.student?.franchiseId
      ?? user.employee?.franchiseId
      ?? null;
    const franchise = user.franchise ?? (franchiseId
      ? await prisma.franchise.findUnique({
          where: { id: franchiseId },
          select: { name: true, telefone: true, whatsapp: true },
        })
      : null);
    const reporterPhone = user.student?.celular
      || user.student?.telefone
      || user.company?.telefone
      || franchise?.whatsapp
      || franchise?.telefone
      || "";
    const description = existing?.description ?? buildDescription(input, {
      role: user.role || session.user.role || "",
      companyName: user.company?.name,
      unitName: franchise?.name,
    });

    const supportCase = existing ?? await prisma.supportCase.create({
      data: {
        externalReference,
        userId: session.user.id,
        franchiseId,
        companyId: user.companyId,
        reporterName: user.name,
        reporterEmail: user.email,
        reporterPhone,
        title: input.title,
        description,
        path: input.path,
        attemptedAction: input.attemptedAction,
        errorMessage: input.errorMessage,
        imageUrl: input.imageUrl || null,
        technicalData: input.technicalData || undefined,
      },
    });

    const mapping = getSupportMapping(franchiseId ?? (user.role === "FRANQUEADORA" ? "FRANQUEADORA" : null));
    if (!mapping) {
      await prisma.supportCase.update({
        where: { id: supportCase.id },
        data: { status: "ERROR", lastError: "not_mapped" },
      });
      return NextResponse.json({
        error: "Organização ou unidade ainda não está mapeada no suporte.",
        externalReference,
      }, { status: 404 });
    }

    const result = await sendSupportCase({
      orgId: mapping.orgId,
      unitId: mapping.unitId,
      externalReference: supportCase.externalReference,
      reporterName: supportCase.reporterName,
      reporterEmail: supportCase.reporterEmail,
      reporterPhone: supportCase.reporterPhone || "",
      category: "bug",
      title: supportCase.title,
      description: supportCase.description,
    });

    if (result.ok) {
      await prisma.supportCase.update({
        where: { id: supportCase.id },
        data: { status: "SENT", protocol: result.protocol, lastError: null, attemptCount: { increment: 1 } },
      });
      return NextResponse.json({
        ok: true,
        created: result.status === 201,
        protocol: result.protocol,
        externalReference,
      }, { status: result.status });
    }

    await prisma.supportCase.update({
      where: { id: supportCase.id },
      data: { status: result.retryable ? "PENDING" : "ERROR", lastError: result.code, attemptCount: { increment: 1 } },
    });
    return NextResponse.json({
      error: result.message,
      retryable: result.retryable,
      externalReference,
    }, { status: result.status });
  } catch (error) {
    console.error("[support/cases] Falha ao abrir chamado:", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível abrir o chamado agora.", retryable: true, externalReference }, { status: 503 });
  }
}
