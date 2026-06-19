import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContract, criarOuAtualizarLancamentoContrato } from "@/lib/actions/contracts";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIP } from "@/lib/audit";
import { checkPermission } from "@/lib/permissions";

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

  try {
    const contract = await getContract(params.id);
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

    // Security: only franqueado can see their own contracts
    if (session.user.franchiseId && contract.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Acesso não autorizado a este contrato." }, { status: 403 });
    }

    return NextResponse.json({ contract });
  } catch (e: any) {
    console.error("[contratos/id] GET error:", e?.message || e);
    return NextResponse.json({ error: "Erro ao carregar contrato." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "contratos");
  if (permCheck) return permCheck;

  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  // Ownership check: FRANQUEADO/FUNCIONARIO cannot edit contracts of other franchises
  if (role !== "FRANQUEADORA") {
    const existing = await prisma.contract.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!existing || existing.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

  // Converte campos numéricos — string vazia vira null, string/number vira Float
  const toFloat = (v: any) => (v === "" || v === null || v === undefined) ? null : Number(v);
  if (data.bolsa         !== undefined) data.bolsa         = toFloat(data.bolsa) ?? 0;
  if (data.valorEmpresa  !== undefined) data.valorEmpresa  = toFloat(data.valorEmpresa);
  if (data.auxTransporte !== undefined) data.auxTransporte = toFloat(data.auxTransporte);
  if (data.chDiaria   !== undefined) data.chDiaria  = data.chDiaria   === "" ? null : parseInt(String(data.chDiaria));
  if (data.chSemanal  !== undefined) data.chSemanal = data.chSemanal  === "" ? null : parseInt(String(data.chSemanal));
  if (data.vencimento !== undefined) data.vencimento= data.vencimento === "" ? null : parseInt(String(data.vencimento));

  try {
    const contract = await prisma.contract.update({ where: { id: params.id }, data });

    // Sync student status if contract status changed
    if (data.status !== undefined && contract.studentId) {
      await syncEstudanteStatus(contract.studentId);
    }

    // ── Sincronizar lançamento financeiro ────────────────────────────────
    // Se valorEmpresa ou vencimento mudaram, atualiza (ou cria) o lançamento pendente
    const financialChanged = data.valorEmpresa !== undefined || data.vencimento !== undefined;
    if (financialChanged) {
      const valorAtual = (data.valorEmpresa ?? contract.valorEmpresa) as number | null;
      const vencAtual  = (data.vencimento  ?? contract.vencimento)  as number | null;
      if (valorAtual && valorAtual > 0) {
        const comp = contract.companyId
          ? await prisma.company.findUnique({ where: { id: contract.companyId }, select: { name: true } }).catch(() => null)
          : null;
        await criarOuAtualizarLancamentoContrato({
          contractId: params.id,
          valorEmpresa: valorAtual,
          vencimento: vencAtual,
          franchiseId: contract.franchiseId,
          companyId: contract.companyId,
          companyName: comp?.name,
          numero: contract.numero,
        }).catch(() => {});
      }
    }

    // Audit log
    logAudit({
      userId: session.user.id,
      role: session.user.role || "",
      franchiseId: contract.franchiseId,
      acao: data.status ? `CONTRATO_STATUS_${data.status}` : "CONTRATO_EDITADO",
      modulo: "contratos",
      detalhes: `contrato:${params.id} | numero:${contract.numero || ""} | campos:${Object.keys(data).join(",")}`,
      ip: getClientIP(req),
    });

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
  const franchiseId = session.user.franchiseId;
  if (!["FRANQUEADORA","FRANQUEADO","FUNCIONARIO"].includes(role || "")) {
    return NextResponse.json({ error: "Sem permissão para excluir contratos." }, { status: 403 });
  }

  const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contrato) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  // Ownership check: FRANQUEADO/FUNCIONARIO cannot delete contracts of other franchises
  if (role !== "FRANQUEADORA" && contrato.franchiseId !== franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    // Audit log
    logAudit({
      userId: session.user.id,
      role: role,
      franchiseId: contrato.franchiseId,
      acao: "CONTRATO_EXCLUIDO",
      modulo: "contratos",
      detalhes: `contrato:${params.id} | numero:${contrato.numero || ""}`,
      ip: getClientIP(_req),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir contrato." }, { status: 500 });
  }
}
