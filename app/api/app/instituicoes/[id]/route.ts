import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "instituicoes");
  if (permCheck) return permCheck;

  const inst = await prisma.institution.findUnique({ where: { id: params.id } });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ instituicao: inst });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir instituições." }, { status: 403 });
    }

    const inst = await prisma.institution.findUnique({
      where: { id: params.id },
      include: { _count: { select: { students: true, contracts: true } } },
    });
    if (!inst) return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });

    const studentCount = (inst as any)._count.students;
    const contractCount = (inst as any)._count.contracts;

    if (studentCount > 0 || contractCount > 0) {
      return NextResponse.json({
        error: `Não é possível excluir: "${inst.name}" possui ${studentCount} estudante(s) e ${contractCount} contrato(s) vinculados. Desvincule-os antes de excluir.`,
      }, { status: 400 });
    }

    await prisma.institution.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "INSTITUICAO_DELETE");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Edição de instituição restrita a FRANQUEADORA e FRANQUEADO
  // Instituições são compartilhadas na rede — apenas admins podem editar
  const role = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão para editar instituições." }, { status: 403 });
  }

  const body = await req.json();
  const inst = await prisma.institution.update({
    where: { id: params.id },
    data: {
      name: body.name,
      razaoSocial: body.razaoSocial,
      cnpj: body.cnpj,
      tipo: body.tipo,
      email: body.email,
      telefone: body.telefone,
      coordenador: body.coordenador,
      cargoCoord: body.cargoCoord,
      endereco: body.endereco,
      cidade: body.cidade,
      uf: body.uf,
      cep: body.cep,
      site: body.site,
      cursos: body.cursos || [],
    },
  });
  return NextResponse.json({ instituicao: inst });
  } catch (e) {
    return handleApiError(e, "INSTITUICAO_PATCH");
  }
}
