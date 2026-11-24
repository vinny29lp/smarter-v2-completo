import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarAvaliacaoLink } from "@/lib/email";
import { handleApiError } from "@/lib/api-response";
import { tokenAvaliacao } from "@/lib/automacao/token";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      student: { select: { name: true } },
    },
  });

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  if (session.user.role === "EMPRESA" || session.user.role === "ESTUDANTE") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!["FRANQUEADORA", "EQUIPE"].includes(session.user.role || "") && (!session.user.franchiseId || contract.franchiseId !== session.user.franchiseId)) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  const emailDestino = contract.company.email;
  if (!emailDestino) {
    return NextResponse.json({ error: "A empresa não tem e-mail cadastrado." }, { status: 400 });
  }

  // Derivar URL base da própria requisição — sempre correto em qualquer ambiente.
  // Evita o problema de NEXT_PUBLIC_APP_URL=http://localhost:3000 no .env ser usado em produção.
  const reqUrl = new URL(req.url);
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  const isLocalhost = fromEnv.includes("localhost") || fromEnv.includes("127.0.0");
  const appUrl = (!isLocalhost && fromEnv)
    ? fromEnv.replace(/\/$/, "")
    : `${reqUrl.protocol}//${reqUrl.host}`;

  const ok = await enviarAvaliacaoLink({
    email: emailDestino,
    nomeEmpresa: contract.company.name,
    nomeEstagiario: contract.student.name,
    contratoId: contract.id,
    loginUrl: appUrl,
    // Mesmo link direto da Lia: abre sem login e dá baixa na hora. Só vale para estágio ATIVO.
    linkDireto: contract.status === "ATIVO" ? `${appUrl}/avaliar?c=${contract.id}&t=${tokenAvaliacao(contract.id)}` : undefined,
  });

  if (!ok) {
    return NextResponse.json({ error: "Falha ao enviar o e-mail. Verifique a configuração de e-mail." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, emailEnviado: emailDestino });
  } catch (e) {
    return handleApiError(e, "CONTRATO_AVALIACAO_POST");
  }
}
