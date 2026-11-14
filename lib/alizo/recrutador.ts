/**
 * Recrutador da Alizo ⇄ Smarter: espelha vagas abertas (POST /jobs) e envia candidatos COM consentimento
 * (POST /jobs/{id}/candidates, consent:true). Só unidades mapeadas em alizo_unidades; desligado sem
 * ALIZO_RECRUTADOR_ATIVO=true. Roda dentro do cron alizo-sync (a cada 30 min), com tetos por execução.
 */
import { prisma } from "@/lib/prisma";
import { criarAlizoClient, normalizarTelefone, AlizoError } from "./client";
import { recrutadorAtivo, temConsentimento, perfilDaVaga, tituloDaVaga, notasDoCandidato } from "./recrutadorRegras";

const MAX_VAGAS = 10;
const MAX_CANDIDATOS = 30;

export async function sincronizarRecrutador() {
  const resumo = { ativo: recrutadorAtivo(), vagasCriadas: 0, candidatosEnviados: 0, semConsentimento: 0, erros: 0 };
  if (!resumo.ativo) return resumo;
  const client = criarAlizoClient();
  if (!client) return { ...resumo, ativo: false };

  const mapa = await prisma.alizoUnidade.findMany({ where: { NOT: { franchiseKey: "MATRIZ" } } });
  const unidadePor = new Map(mapa.map(m => [m.franchiseKey, m.alizoUnitId]));
  if (unidadePor.size === 0) return resumo;
  const franquias = Array.from(unidadePor.keys());

  // 1) Vagas abertas ainda não espelhadas
  const vagas = await prisma.vacancy.findMany({
    where: { status: "ABERTA", alizoJobId: null, franchiseId: { in: franquias } },
    select: { id: true, titulo: true, cursoRequerido: true, area: true, cidade: true, uf: true, nivel: true, requisitos: true, franchiseId: true },
    take: MAX_VAGAS,
  });
  for (const v of vagas) {
    try {
      const r = await client.criarVaga({
        unit_id: unidadePor.get(v.franchiseId)!, title: tituloDaVaga(v), urgency: "normal",
        target_shortlist_size: 5, profile: perfilDaVaga(v),
      });
      await prisma.vacancy.update({ where: { id: v.id }, data: { alizoJobId: r.job.id } });
      resumo.vagasCriadas++;
    } catch (e: any) {
      resumo.erros++;
      console.error("[alizo-recrutador] criar vaga falhou:", e?.status, e?.message);
    }
  }

  // 2) Candidatos com consentimento ainda não enviados
  const candidaturas = await prisma.application.findMany({
    where: { vacancy: { alizoJobId: { not: null }, status: "ABERTA", franchiseId: { in: franquias } } },
    select: {
      id: true, matching: true, vacancy: { select: { alizoJobId: true } },
      student: { select: { name: true, email: true, celular: true, telefone: true, curso: true, semestre: true, periodo: true, cidade: true, uf: true, discResult: true, partnerConsentStatus: true } },
    },
    orderBy: { createdAt: "desc" }, take: 300,
  });
  if (candidaturas.length === 0) return resumo;
  const feitos = new Set((await prisma.automacaoEnvio.findMany({
    where: { tipo: "ALIZO_CANDIDATO", refId: { in: candidaturas.map(c => c.id) } }, select: { refId: true },
  })).map(x => x.refId));

  let enviados = 0;
  for (const c of candidaturas) {
    if (enviados >= MAX_CANDIDATOS) break;
    if (feitos.has(c.id)) continue;
    if (!temConsentimento(c.student.partnerConsentStatus)) { resumo.semConsentimento++; continue; }
    try {
      const fone = normalizarTelefone(c.student.celular || c.student.telefone);
      await client.adicionarCandidato(c.vacancy.alizoJobId!, {
        name: c.student.name, email: c.student.email, ...(fone ? { phone: fone } : {}),
        notes: notasDoCandidato(c.student, c.matching), consent: true,
      });
      enviados++; resumo.candidatosEnviados++;
    } catch (e: any) {
      if (!(e instanceof AlizoError && e.status === 409)) { resumo.erros++; console.error("[alizo-recrutador] candidato falhou:", e?.status, e?.message); continue; }
      // 409 = já está na vaga: conta como enviado
    }
    await prisma.automacaoEnvio.create({
      data: { tipo: "ALIZO_CANDIDATO", refId: c.id, destinatario: c.student.email, canal: "alizo", detalhe: "Candidato enviado ao Recrutador da Alizo" },
    }).catch(() => {});
  }
  return resumo;
}
