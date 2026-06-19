"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Clock, Users, Activity, ChevronDown, ChevronUp,
  RefreshCw, Download, LogIn, Calendar, Zap,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AcaoTimeline {
  id: string;
  acao: string;
  modulo: string | null;
  detalhes: string | null;
  ip: string | null;
  horario: string | null;
}

interface MembroRelatorio {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  permissoes: string[];
  lastLoginAt: string | null;
  totalLogins: number;
  totalAcoes: number;
  primeiroAcesso: string | null;
  ultimaAtividade: string | null;
  janelaAtivaMin: number | null;
  porModulo: Record<string, number>;
  timeline: AcaoTimeline[];
  ativo: boolean;
}

interface Relatorio {
  membros: MembroRelatorio[];
  data: string;
  totalMembros: number;
  totalAtivos: number;
  totalAcoes: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHorario(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

function formatJanela(min: number | null) {
  if (min === null) return "—";
  if (min < 1) return "< 1 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

const MODULO_LABELS: Record<string, string> = {
  financeiro: "Financeiro", contratos: "Contratos", estudantes: "Estudantes",
  empresas: "Empresas", vagas: "Vagas", processos: "Processos",
  crm: "CRM", instituicoes: "Instituições", configuracoes: "Configurações",
  assinaturas: "Assinaturas", saude: "Saúde", seguros: "Seguros",
  gamificacao: "Gamificação", franqueados: "Franqueados", engajamento: "Engajamento",
};

const ACAO_LABELS: Record<string, string> = {
  LOGIN: "🔐 Entrou no sistema",
  ESTUDANTE_CRIADO: "🎓 Cadastrou estudante",
  EMPRESA_CRIADA: "🏢 Cadastrou empresa",
  CRM_LEAD_CRIADO: "📞 Criou lead no CRM",
  FINANCEIRO_CRIADO: "💰 Lançamento financeiro criado",
  FINANCEIRO_EDITADO: "✏️ Lançamento financeiro editado",
  FINANCEIRO_EXCLUIDO: "🗑️ Lançamento financeiro excluído",
  CONTRATO_EDITADO: "📄 Contrato editado",
  CONTRATO_EXCLUIDO: "🗑️ Contrato excluído",
  CONTRATO_STATUS_ATIVO: "✅ Contrato ativado",
  CONTRATO_STATUS_ENCERRADO: "🔴 Contrato encerrado",
  CONTRATO_STATUS_CANCELADO: "❌ Contrato cancelado",
};

function labelAcao(acao: string) {
  if (ACAO_LABELS[acao]) return ACAO_LABELS[acao];
  if (acao.startsWith("CONTRATO_STATUS_")) return `📄 Contrato → ${acao.replace("CONTRATO_STATUS_", "")}`;
  return acao.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

const MODULO_CORES: Record<string, string> = {
  financeiro: "bg-emerald-100 text-emerald-700",
  contratos: "bg-blue-100 text-blue-700",
  estudantes: "bg-violet-100 text-violet-700",
  empresas: "bg-orange-100 text-orange-700",
  crm: "bg-pink-100 text-pink-700",
  processos: "bg-cyan-100 text-cyan-700",
  vagas: "bg-amber-100 text-amber-700",
  instituicoes: "bg-slate-100 text-slate-700",
  saude: "bg-red-100 text-red-700",
  auth: "bg-gray-100 text-gray-500",
};

function corModulo(modulo: string) {
  return MODULO_CORES[modulo] || "bg-gray-100 text-gray-600";
}

// ─── Componente Card de Membro ────────────────────────────────────────────────

function CardMembro({ membro }: { membro: MembroRelatorio }) {
  const [aberto, setAberto] = useState(false);

  const modulosOrdenados = Object.entries(membro.porModulo)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${membro.ativo ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      {/* Header do membro */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
        onClick={() => setAberto(o => !o)}
      >
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${membro.ativo ? "bg-[#f5c400] text-[#0f2a5e]" : "bg-slate-200 text-slate-400"}`}>
          {membro.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm">{membro.nome}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${membro.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
              {membro.ativo ? "● Ativo hoje" : "○ Sem atividade hoje"}
            </span>
          </div>
          <p className="text-xs text-slate-400">{membro.cargo} · {membro.email}</p>
        </div>

        {/* Métricas rápidas */}
        {membro.ativo && (
          <div className="hidden sm:flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-xs text-slate-400">1º acesso</p>
              <p className="text-sm font-bold text-slate-700">{formatHorario(membro.primeiroAcesso)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Último</p>
              <p className="text-sm font-bold text-slate-700">{formatHorario(membro.ultimaAtividade)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Online</p>
              <p className="text-sm font-bold text-[#0f2a5e]">{formatJanela(membro.janelaAtivaMin)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Ações</p>
              <p className="text-sm font-bold text-slate-700">{membro.totalAcoes}</p>
            </div>
          </div>
        )}

        {/* Chevron */}
        {membro.ativo && (
          <div className="ml-2 text-slate-400 shrink-0">
            {aberto ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </div>
        )}
      </div>

      {/* Detalhes expandidos */}
      {aberto && membro.ativo && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
          {/* Mobile: métricas */}
          <div className="flex flex-wrap gap-4 mb-4 sm:hidden">
            {[
              { label: "1º acesso", val: formatHorario(membro.primeiroAcesso) },
              { label: "Último", val: formatHorario(membro.ultimaAtividade) },
              { label: "Online", val: formatJanela(membro.janelaAtivaMin) },
              { label: "Ações", val: String(membro.totalAcoes) },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-[10px] text-slate-400">{m.label}</p>
                <p className="text-sm font-bold text-slate-700">{m.val}</p>
              </div>
            ))}
          </div>

          {/* Módulos acessados */}
          {modulosOrdenados.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Módulos com atividade</p>
              <div className="flex flex-wrap gap-2">
                {modulosOrdenados.map(([mod, count]) => (
                  <span key={mod} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${corModulo(mod)}`}>
                    {MODULO_LABELS[mod] || mod}
                    <span className="font-black">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline de ações */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Timeline de ações</p>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {membro.timeline.map((a, i) => (
                <div key={a.id} className={`flex items-start gap-3 py-1.5 px-2 rounded-lg text-xs ${a.acao === "LOGIN" ? "bg-blue-50" : "hover:bg-white"}`}>
                  <span className="text-slate-400 font-mono shrink-0 pt-0.5 tabular-nums">
                    {formatHorario(a.horario)}
                  </span>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${a.modulo ? corModulo(a.modulo) : "bg-gray-100 text-gray-500"}`}>
                    {a.modulo ? (MODULO_LABELS[a.modulo] || a.modulo) : "sistema"}
                  </span>
                  <span className="text-slate-600 flex-1">{labelAcao(a.acao)}</span>
                  {a.ip && <span className="text-slate-300 shrink-0 hidden lg:block">{a.ip}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RelatorioEquipePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Data selecionada — padrão hoje
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [dataSelecionada, setDataSelecionada] = useState(hoje);

  // Apenas FRANQUEADORA
  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== "FRANQUEADORA") router.replace("/dashboard");
  }, [session, status, router]);

  const carregar = useCallback(async (data: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/app/equipe/relatorio?data=${data}`);
      if (!res.ok) throw new Error((await res.json()).error || `Erro ${res.status}`);
      setRelatorio(await res.json());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatório");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "FRANQUEADORA") {
      carregar(dataSelecionada);
    }
  }, [status, session, carregar, dataSelecionada]);

  if (status === "loading") return null;
  if (session?.user?.role !== "FRANQUEADORA") return null;

  const dataExibicao = new Date(dataSelecionada + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push("/dashboard/equipe")} className="text-slate-400 hover:text-slate-600 text-sm">
              ← Equipe
            </button>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Relatório de Atividade</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{dataExibicao}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de data */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Calendar size={14} className="text-slate-400"/>
            <input
              type="date"
              value={dataSelecionada}
              max={hoje}
              onChange={e => setDataSelecionada(e.target.value)}
              className="text-sm text-slate-700 bg-transparent border-0 outline-none"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => carregar(dataSelecionada)}
            disabled={carregando}
          >
            <RefreshCw size={14} className={carregando ? "animate-spin" : ""}/>
            Atualizar
          </Button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          ⚠️ {erro}
        </div>
      )}

      {carregando && !relatorio && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw size={28} className="animate-spin text-[#0f2a5e]"/>
          <p className="text-sm">Gerando relatório…</p>
        </div>
      )}

      {relatorio && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Membros na Equipe", val: relatorio.totalMembros, icon: Users, cor: "text-[#0f2a5e]" },
              { label: "Ativos hoje", val: relatorio.totalAtivos, icon: Activity, cor: "text-green-600" },
              { label: "Ações realizadas", val: relatorio.totalAcoes, icon: Zap, cor: "text-amber-600" },
              {
                label: "Sem atividade",
                val: relatorio.totalMembros - relatorio.totalAtivos,
                icon: Clock,
                cor: "text-slate-400",
              },
            ].map(c => (
              <Card key={c.label}>
                <div className="p-4">
                  <c.icon size={18} className={`${c.cor} mb-2`}/>
                  <p className={`text-2xl font-black ${c.cor}`}>{c.val}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Lista de membros */}
          {relatorio.membros.length === 0 ? (
            <Card>
              <div className="py-16 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-3 opacity-40"/>
                <p className="font-semibold">Nenhum membro da Equipe Smarter cadastrado</p>
                <p className="text-sm mt-1">Crie membros em Equipe → Equipe Smarter</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {relatorio.membros.map(membro => (
                <CardMembro key={membro.id} membro={membro}/>
              ))}
            </div>
          )}

          {/* Rodapé informativo */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
            <p className="font-semibold text-slate-500 mb-1">ℹ️ Como interpretar o relatório</p>
            <p>
              <strong>Online:</strong> tempo entre o primeiro e o último evento do dia (janela ativa).
              {" "}<strong>Ações:</strong> criações, edições e exclusões registradas — leituras/consultas não são contabilizadas individualmente.
              {" "}<strong>Horários</strong> no fuso de Brasília (UTC-3).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
