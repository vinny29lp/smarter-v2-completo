/**
 * Bloqueio de acesso por inadimplência (Taxa de Desenvolvimento 30+ dias em atraso).
 *
 * ⚠️ FEATURE FLAG — BLOQUEIO EM MODO DETECÇÃO:
 * O bloqueio AUTOMÁTICO só é aplicado se a env BLOQUEIO_INADIMPLENCIA_ATIVO="true"
 * estiver configurada (Vercel). Sem a flag (padrão atual de produção), o cron apenas
 * DETECTA e NOTIFICA a Franqueadora — nenhuma unidade é bloqueada automaticamente.
 * Para ativar o bloqueio real: definir BLOQUEIO_INADIMPLENCIA_ATIVO=true na Vercel
 * (somente com confirmação explícita do usuário).
 *
 * O bloqueio MANUAL (botão na tela do franqueado) e a válvula de escape
 * (liberar acesso com prazo de tolerância) funcionam independentemente da flag.
 */
import { prisma } from "@/lib/prisma";

export const DIAS_ATRASO_BLOQUEIO = 30;

export function bloqueioAutomaticoAtivo(): boolean {
  return process.env.BLOQUEIO_INADIMPLENCIA_ATIVO === "true";
}

export interface InadimplenciaInfo {
  franchiseId: string;
  nome: string;
  email: string | null;
  totalVencido: number;
  qtdCobrancas: number;
  diasAtrasoMax: number;
  acessoBloqueado: boolean;
  toleranciaAte: Date | null;
}

/** Unidades com cobrança de Franquia não paga vencida há DIAS_ATRASO_BLOQUEIO+ dias. */
export async function detectarInadimplentes(): Promise<InadimplenciaInfo[]> {
  const corte = new Date(Date.now() - DIAS_ATRASO_BLOQUEIO * 86400000);

  const cobrancas = await prisma.financial.findMany({
    where: {
      categoria: "Franquia",
      status: { in: ["PENDENTE", "VENCIDO"] },
      cancelado: { not: true },
      vencimentoAt: { lt: corte },
      franchiseId: { not: null },
    },
    select: {
      franchiseId: true,
      valor: true,
      vencimentoAt: true,
      franchise: {
        select: {
          id: true, name: true, email: true,
          acessoBloqueado: true, bloqueioLiberadoAte: true,
        } as any,
      },
    },
  });

  const porFranquia = new Map<string, InadimplenciaInfo>();
  const agora = Date.now();

  for (const c of cobrancas) {
    if (!c.franchiseId || !c.franchise) continue;
    const f: any = c.franchise;
    const dias = Math.floor((agora - new Date(c.vencimentoAt!).getTime()) / 86400000);
    const atual = porFranquia.get(c.franchiseId) || {
      franchiseId: c.franchiseId,
      nome: f.name,
      email: f.email ?? null,
      totalVencido: 0,
      qtdCobrancas: 0,
      diasAtrasoMax: 0,
      acessoBloqueado: !!f.acessoBloqueado,
      toleranciaAte: f.bloqueioLiberadoAte ? new Date(f.bloqueioLiberadoAte) : null,
    };
    atual.totalVencido += c.valor;
    atual.qtdCobrancas += 1;
    atual.diasAtrasoMax = Math.max(atual.diasAtrasoMax, dias);
    porFranquia.set(c.franchiseId, atual);
  }

  return Array.from(porFranquia.values());
}

/**
 * Passo diário do cron: detecta inadimplentes 30+ dias e
 *  - flag ON  → bloqueia o acesso da unidade (respeitando tolerância) e notifica
 *  - flag OFF → apenas notifica a Franqueadora (modo detecção, padrão atual)
 * Notificações são deduplicadas por dia (uma por unidade/dia).
 */
export async function processarBloqueiosAutomaticos() {
  const inadimplentes = await detectarInadimplentes();
  const ativo = bloqueioAutomaticoAtivo();
  const agora = new Date();

  let bloqueadas = 0;
  let notificadas = 0;
  const detalhes: any[] = [];

  // Usuários FRANQUEADORA que receberão a notificação in-app
  const admins = await prisma.user.findMany({
    where: { role: "FRANQUEADORA", active: true },
    select: { id: true },
  });

  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);

  for (const info of inadimplentes) {
    const emTolerancia = info.toleranciaAte && info.toleranciaAte > agora;

    if (ativo && !info.acessoBloqueado && !emTolerancia) {
      await prisma.franchise.update({
        where: { id: info.franchiseId },
        data: {
          acessoBloqueado: true,
          bloqueadoEm: agora,
          bloqueioMotivo: `AUTO: Taxa de Desenvolvimento vencida há ${info.diasAtrasoMax} dias (R$ ${info.totalVencido.toFixed(2)})`,
        } as any,
      });
      bloqueadas++;
    }

    // Notificação in-app para a Franqueadora — 1x por unidade por dia
    const jaNotificado = await prisma.notification.findFirst({
      where: {
        tipo: "inadimplencia_30d",
        link: `/dashboard/franqueados/${info.franchiseId}`,
        createdAt: { gte: inicioDia },
      },
      select: { id: true },
    });

    if (!jaNotificado && admins.length > 0) {
      const acao = ativo && !emTolerancia
        ? "acesso BLOQUEADO automaticamente"
        : emTolerancia
          ? "em tolerância concedida pelo admin"
          : "seria bloqueada (bloqueio automático DESATIVADO)";
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          titulo: `🚨 Inadimplência 30+ dias: ${info.nome}`,
          mensagem: `${info.qtdCobrancas} cobrança(s) de Taxa de Desenvolvimento em atraso há até ${info.diasAtrasoMax} dias — total R$ ${info.totalVencido.toFixed(2).replace(".", ",")}. Unidade ${acao}.`,
          tipo: "inadimplencia_30d",
          link: `/dashboard/franqueados/${info.franchiseId}`,
        })),
      });
      notificadas++;
    }

    detalhes.push({
      franquia: info.nome,
      diasAtrasoMax: info.diasAtrasoMax,
      totalVencido: info.totalVencido,
      bloqueada: ativo && !emTolerancia ? true : info.acessoBloqueado,
      emTolerancia: !!emTolerancia,
    });
  }

  return {
    flagBloqueioAtivo: ativo,
    inadimplentes: inadimplentes.length,
    bloqueadas,
    notificadas,
    detalhes,
  };
}

/**
 * Reavalia o bloqueio de uma unidade após um pagamento ser confirmado
 * (baixa manual ou boleto Cora pago). Só desfaz bloqueios AUTOMÁTICOS —
 * bloqueio manual do admin permanece até o admin liberar.
 */
export async function reavaliarBloqueioAposPagamento(franchiseId: string | null | undefined) {
  if (!franchiseId) return;
  try {
    const franchise: any = await prisma.franchise.findUnique({
      where: { id: franchiseId },
      select: { id: true, acessoBloqueado: true, bloqueioMotivo: true } as any,
    });
    if (!franchise?.acessoBloqueado) return;
    if (!String(franchise.bloqueioMotivo || "").startsWith("AUTO:")) return;

    const corte = new Date(Date.now() - DIAS_ATRASO_BLOQUEIO * 86400000);
    const aindaVencidas = await prisma.financial.count({
      where: {
        franchiseId,
        categoria: "Franquia",
        status: { in: ["PENDENTE", "VENCIDO"] },
        cancelado: { not: true },
        vencimentoAt: { lt: corte },
      },
    });

    if (aindaVencidas === 0) {
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: {
          acessoBloqueado: false,
          bloqueadoEm: null,
          bloqueioMotivo: null,
          bloqueioLiberadoAte: null,
        } as any,
      });
      console.log(`[bloqueio] Unidade ${franchiseId} desbloqueada automaticamente após pagamento.`);
    }
  } catch (e: any) {
    // Nunca deixa a reavaliação derrubar a baixa do pagamento
    console.error("[bloqueio] Erro ao reavaliar bloqueio:", e.message);
  }
}
