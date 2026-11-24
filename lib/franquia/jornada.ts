/** Jornada de fechamento de franquia: ativação após assinatura do contrato (idempotente). */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buscarStatusAutentique } from "@/lib/autentique";
import { enviarManualImplantacao } from "@/lib/email";
import { sincronizarFranquiaAlizo } from "@/lib/alizo/provisionar";
import { normalizarRegioes } from "@/lib/onboarding/regras";
import { regioesDoCadastro, type CadastroFranquia } from "./cadastro";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
export const APP_URL = (_raw && !_raw.includes("localhost") && !_raw.includes("127.0.0")) ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

export const gerarToken = () => crypto.randomBytes(18).toString("base64url");

async function avisarMatriz(titulo: string, mensagem: string, link: string) {
  const us = await prisma.user.findMany({ where: { role: "FRANQUEADORA", active: true }, select: { id: true } });
  if (us.length) await prisma.notification.createMany({ data: us.map(u => ({ userId: u.id, titulo, mensagem, tipo: "franquia_jornada", link })) }).catch(() => {});
}

async function nota(leadId: string, texto: string) {
  await prisma.franquiaNota.create({ data: { leadId, tipo: "alerta", texto } as any }).catch(() => {});
}

/** Chamado quando o Autentique confirma que todos assinaram. Cria unidade + usuário e envia o manual. */
export async function ativarFranquiaPorLead(leadId: string): Promise<{ ok: boolean; motivo?: string }> {
  // Trava: só um processo passa daqui (cron concorrente / reexecução).
  const claim = await prisma.franquiaLead.updateMany({
    where: { id: leadId, contratoAssinadoEm: null, contratoDocId: { not: null } },
    data: { contratoAssinadoEm: new Date(), etapa: "fechado", situacao: "vendido", etapaChangedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, motivo: "já processado" };

  const lead = await prisma.franquiaLead.findUnique({ where: { id: leadId } });
  const c = lead?.cadastro as unknown as CadastroFranquia | null;
  if (!lead || !c) { await nota(leadId, "Contrato assinado, mas sem cadastro para criar a unidade. Crie manualmente."); return { ok: false, motivo: "sem cadastro" }; }

  const senha = crypto.randomBytes(6).toString("hex") + "S1@";
  const hash = await bcrypt.hash(senha, 10);
  let franchise: any, user: any;
  try {
    ({ franchise, user } = await prisma.$transaction(async (tx) => {
      const f = await tx.franchise.create({
        data: {
          name: c.nomeUnidade, razaoSocial: c.razaoSocial, cnpj: c.cnpj || null, cpf: c.cpf,
          dataNasc: c.dataNasc ? new Date(c.dataNasc) : null,
          responsavel: c.nome, email: c.email, telefone: c.telefone, cidade: c.cidade, uf: c.uf, endereco: c.endereco, cep: c.cep,
          mensalidade: 250, plano: "completo",
          regioesAtuacao: normalizarRegioes(regioesDoCadastro(c)) as any,
          onboardingObrigatorio: true, quizObrigatorio: true,
        } as any,
      });
      const u = await tx.user.create({ data: { name: c.nome, email: c.email, password: hash, role: "FRANQUEADO", franchiseId: f.id } });
      return { franchise: f, user: u };
    }));
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "CNPJ ou e-mail já cadastrado" : (e?.message || "erro");
    await nota(leadId, `Contrato assinado, mas a unidade NÃO foi criada automaticamente (${msg}). Crie em Franqueados.`);
    await avisarMatriz("⚠️ Contrato assinado: criar unidade manualmente", `${c.nome} assinou, mas houve problema: ${msg}.`, `/dashboard/franquia-crm/${leadId}`);
    return { ok: false, motivo: msg };
  }

  await prisma.franquiaLead.update({ where: { id: leadId }, data: { franchiseId: franchise.id } });
  await sincronizarFranquiaAlizo(franchise.id).catch((e: any) => console.error("[jornada] Alizo:", e?.message));

  const enviado = await enviarManualImplantacao({
    email: user.email, nome: c.nome, nomeUnidade: franchise.name, senha,
    manualUrl: `${APP_URL}/implantacao/${lead.tokenPublico}`,
  }).catch(() => false);
  if (enviado) await prisma.franquiaLead.update({ where: { id: leadId }, data: { manualEnviadoEm: new Date() } });
  await nota(leadId, enviado ? `Contrato assinado. Unidade "${franchise.name}" criada e manual de implantação enviado para ${c.email}.`
    : `Contrato assinado. Unidade "${franchise.name}" criada, mas o e-mail do manual FALHOU. Reenvie as credenciais manualmente.`);
  await avisarMatriz("🏆 Franquia assinada!", `${c.nome} assinou. Unidade ${franchise.name} criada${enviado ? " e manual enviado" : " (e-mail do manual falhou)"}.`, `/dashboard/franquia-crm/${leadId}`);
  return { ok: true };
}

/** Consulta o Autentique dos contratos pendentes e ativa os assinados. */
export async function verificarContratosPendentes() {
  const pend = await prisma.franquiaLead.findMany({ where: { contratoDocId: { not: null }, contratoAssinadoEm: null }, select: { id: true, contratoDocId: true }, take: 50 });
  const r = { verificados: pend.length, ativados: 0, erros: 0 };
  for (const l of pend) {
    try {
      const st = await buscarStatusAutentique(l.contratoDocId!);
      if (st.allSigned) { const a = await ativarFranquiaPorLead(l.id); if (a.ok) r.ativados++; }
    } catch (e: any) { r.erros++; console.error("[franquia-contratos]", l.id, e?.message); }
  }
  return r;
}
