/**
 * #27 — Lixeira reversível. Antes de excluir um estudante/empresa (que apaga em cascata contratos,
 * documentos, financeiro etc.), guarda uma cópia completa em `lixeira` DENTRO da mesma transação.
 * A restauração recria tudo com os ids originais. Retenção: 90 dias.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { reviverLinhas, expiraEm } from "@/lib/lixeira-util";

type Tx = Prisma.TransactionClient;

export async function arquivarEstudante(tx: Tx, studentId: string, excluidoPor: string) {
  const student = await tx.student.findUnique({ where: { id: studentId } });
  if (!student) return null;
  const user = student.userId ? await tx.user.findUnique({ where: { id: student.userId } }) : null;
  const contracts = await tx.contract.findMany({ where: { studentId } });
  const ids = contracts.map(c => c.id);
  const [evaluations, documents, financials, applications, discTests] = await Promise.all([
    tx.evaluation.findMany({ where: { contractId: { in: ids } } }),
    tx.internshipDocument.findMany({ where: { contractId: { in: ids } } }),
    tx.financial.findMany({ where: { contractId: { in: ids } } }),
    tx.application.findMany({ where: { studentId } }),
    tx.discTest.findMany({ where: { studentId } }),
  ]);
  return tx.lixeira.create({
    data: {
      entidade: "ESTUDANTE", entidadeId: studentId, nome: student.name, franchiseId: student.franchiseId,
      excluidoPor, expiraEm: expiraEm(),
      dados: JSON.parse(JSON.stringify({ user, student, contracts, evaluations, documents, financials, applications, discTests })),
    },
  });
}

export async function arquivarEmpresa(tx: Tx, companyId: string, excluidoPor: string) {
  const company = await tx.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  const [users, vacancies, crmLeads, contracts] = await Promise.all([
    tx.user.findMany({ where: { companyId } }),
    tx.vacancy.findMany({ where: { companyId } }),
    tx.crmLead.findMany({ where: { companyId } }),
    tx.contract.findMany({ where: { companyId } }),
  ]);
  const cids = contracts.map(c => c.id);
  const vids = vacancies.map(v => v.id);
  const [evaluations, documents, financials, applications] = await Promise.all([
    tx.evaluation.findMany({ where: { contractId: { in: cids } } }),
    tx.internshipDocument.findMany({ where: { contractId: { in: cids } } }),
    tx.financial.findMany({ where: { OR: [{ contractId: { in: cids } }, { companyId }] } }),
    tx.application.findMany({ where: { vacancyId: { in: vids } } }),
  ]);
  return tx.lixeira.create({
    data: {
      entidade: "EMPRESA", entidadeId: companyId, nome: company.name, franchiseId: company.franchiseId,
      excluidoPor, expiraEm: expiraEm(),
      dados: JSON.parse(JSON.stringify({ company, users, vacancies, crmLeads, contracts, evaluations, documents, financials, applications })),
    },
  });
}

export async function restaurarDaLixeira(lixeiraId: string): Promise<{ ok: true } | { ok: false; erro: string; status: number }> {
  const item = await prisma.lixeira.findUnique({ where: { id: lixeiraId } });
  if (!item) return { ok: false, erro: "Item não encontrado.", status: 404 };
  if (item.restauradoEm) return { ok: false, erro: "Este item já foi restaurado.", status: 409 };
  if (item.expiraEm.getTime() < Date.now()) return { ok: false, erro: "Prazo de 90 dias vencido.", status: 410 };
  const d: any = item.dados;
  const R = (l: any[]) => reviverLinhas<any>(l);

  try {
    await prisma.$transaction(async (tx) => {
      if (item.entidade === "ESTUDANTE") {
        if (d.user) {
          const u = await tx.user.findFirst({ where: { OR: [{ id: d.user.id }, { email: d.user.email }] } });
          if (u) throw new Error("Já existe um usuário com este e-mail — não é possível restaurar.");
          await tx.user.createMany({ data: R([d.user]) });
        }
        await tx.student.createMany({ data: R([d.student]) });
        await tx.contract.createMany({ data: R(d.contracts), skipDuplicates: true });
        await tx.evaluation.createMany({ data: R(d.evaluations), skipDuplicates: true });
        await tx.internshipDocument.createMany({ data: R(d.documents), skipDuplicates: true });
        await tx.financial.createMany({ data: R(d.financials), skipDuplicates: true });
        await tx.application.createMany({ data: R(d.applications), skipDuplicates: true });
        await tx.discTest.createMany({ data: R(d.discTests), skipDuplicates: true });
      } else {
        const ja = await tx.company.findFirst({ where: { OR: [{ id: d.company.id }, { cnpj: d.company.cnpj }] } });
        if (ja) throw new Error("Já existe uma empresa com este CNPJ — não é possível restaurar.");
        await tx.company.createMany({ data: R([d.company]) });
        await tx.user.createMany({ data: R(d.users), skipDuplicates: true });
        await tx.vacancy.createMany({ data: R(d.vacancies), skipDuplicates: true });
        await tx.crmLead.createMany({ data: R(d.crmLeads), skipDuplicates: true });
        await tx.contract.createMany({ data: R(d.contracts), skipDuplicates: true });
        await tx.evaluation.createMany({ data: R(d.evaluations), skipDuplicates: true });
        await tx.internshipDocument.createMany({ data: R(d.documents), skipDuplicates: true });
        await tx.financial.createMany({ data: R(d.financials), skipDuplicates: true });
        await tx.application.createMany({ data: R(d.applications), skipDuplicates: true });
      }
      await tx.lixeira.update({ where: { id: lixeiraId }, data: { restauradoEm: new Date() } });
    }, { timeout: 30_000 });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message?.slice(0, 300) || "Falha ao restaurar.", status: 409 };
  }
}
