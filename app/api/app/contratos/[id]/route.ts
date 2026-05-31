import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContract } from "@/lib/actions/contracts";
import { prisma } from "@/lib/prisma";

/** Se o estudante não tiver mais contratos ativos, muda status para DISPONIVEL */
async function syncEstudanteStatus(studentId: string) {
  const activeCount = await prisma.contract.count({
    where: {
      studentId,
      status: { in: ["ATIVO", "AGUARDANDO_ASSINATURA", "PENDENTE"] },
    },
  });
  if (activeCount === 0) {
    await prisma.student.updateMany({
      where: { id: studentId, status: "EM_ESTAGIO" },
      data: { status: "DISPONIVEL" },
    });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await getContract(params.id);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Security: only franqueado can see their own contracts
  if (session.user.franchiseId && contract.franchiseId !== session.user.franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ contract });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Campos permitidos para edição
  const allowed = [
    "status","bolsa","valorEmpresa","auxTransporte","beneficios","vencimento",
    "dataInicio","dataFim","atividades","localEstagio","cidade","uf",
    "chDiaria","chSemanal","diasSemana","horarioInicio","horarioFim","intervalo",
    "supervisorNome","supervisorCargo","supervisorEmail","supervisorTel","supervisorAssina",
    "coordNome","coordCargo","coordEmail","coordTel",
    "apoliceSeguro","seguradora","tipoEstagio",
  ];
  const data: Record<string,any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // Converte datas se vierem como string
  if (data.dataInicio) data.dataInicio = new Date(data.dataInicio);
  if (data.dataFim)    data.dataFim    = new Date(data.dataFim);
  if (data.bolsa)         data.bolsa         = Number(data.bolsa);
  if (data.valorEmpresa)  data.valorEmpresa  = Number(data.valorEmpresa);
  if (data.auxTransporte) data.auxTransporte = Number(data.auxTransporte);
  if (data.chDiaria)   data.chDiaria  = parseInt(data.chDiaria);
  if (data.chSemanal)  data.chSemanal = parseInt(data.chSemanal);
  if (data.vencimento) data.vencimento= parseInt(data.vencimento);

  try {
    const contract = await prisma.contract.update({ where: { id: params.id }, data });

    // Sync student status if contract status changed
    if (data.status !== undefined && contract.studentId) {
      await syncEstudanteStatus(contract.studentId);
    }

    return NextResponse.json({ contract });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao atualizar contrato." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Apenas FRANQUEADORA e FRANQUEADO podem excluir contratos
  const role = session.user.role;
  if (!["FRANQUEADORA","FRANQUEADO","FUNCIONARIO"].includes(role || "")) {
    return NextResponse.json({ error: "Sem permissão para excluir contratos." }, { status: 403 });
  }

  const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contrato) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.evaluation.deleteMany({ where: { contractId: params.id } });
      await tx.internshipDocument.deleteMany({ where: { contractId: params.id } });
      await tx.financial.deleteMany({ where: { contractId: params.id } });
      await tx.contract.delete({ where: { id: params.id } });
    });

    // Sync student status after contract deletion
    if (contrato.studentId) {
      await syncEstudanteStatus(contrato.studentId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir contrato." }, { status: 500 });
  }
}
