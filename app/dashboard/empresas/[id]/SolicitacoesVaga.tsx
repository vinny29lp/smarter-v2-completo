"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_BADGE: Record<string, "yellow" | "green" | "red"> = {
  PENDENTE:   "yellow",
  CONVERTIDA: "green",
  REJEITADA:  "red",
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:   "Pendente",
  CONVERTIDA: "Convertida em Vaga",
  REJEITADA:  "Rejeitada",
};

const generoLabel: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  indiferente: "Indiferente",
};

const nivelLabel: Record<string, string> = {
  medio: "Ensino Médio",
  superior: "Ensino Superior",
  pos: "Pós-Graduação",
};

export function SolicitacoesVaga({ empresaId, solicitacoes: inicial }: { empresaId: string; solicitacoes: any[] }) {
  const router = useRouter();
  const [solicitacoes, setSolicitacoes] = useState(inicial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const abrirVaga = async (solId: string) => {
    if (!confirm("Confirmar abertura de vaga a partir desta solicitação?")) return;
    setLoading(solId);
    const res = await fetch(`/api/app/empresas/${empresaId}/solicitacoes/${solId}/abrir-vaga`, { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (data.error) { alert("Erro: " + data.error); return; }
    router.refresh();
    setSolicitacoes(p => p.map(s => s.id === solId ? { ...s, status: "CONVERTIDA", vagaId: data.vagaId } : s));
    alert("✅ Vaga criada com sucesso!");
  };

  const rejeitar = async (solId: string) => {
    if (!confirm("Rejeitar esta solicitação?")) return;
    setLoading(solId);
    await fetch(`/api/app/empresas/${empresaId}/solicitacoes/${solId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJEITADA" }),
    });
    setLoading(null);
    setSolicitacoes(p => p.map(s => s.id === solId ? { ...s, status: "REJEITADA" } : s));
  };

  const verPdf = (solId: string) => {
    window.open(`/api/app/empresas/${empresaId}/solicitacoes/${solId}`, "_blank");
  };

  if (solicitacoes.length === 0) return null;

  return (
    <Card className="p-5 mb-4">
      <h3 className="text-sm font-bold text-slate-700 mb-3">
        📋 Solicitações de Vaga ({solicitacoes.length})
      </h3>
      <div className="space-y-2">
        {solicitacoes.map(sol => (
          <div key={sol.id} className="border border-slate-100 rounded-xl overflow-hidden">
            {/* Header da solicitação */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
              onClick={() => setExpanded(expanded === sol.id ? null : sol.id)}
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{sol.funcao}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  R$ {Number(sol.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                  &nbsp;·&nbsp; {sol.horario}
                  &nbsp;·&nbsp; Recebida em {new Date(sol.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[sol.status] || "yellow"}>
                  {STATUS_LABEL[sol.status] || sol.status}
                </Badge>
                <span className="text-slate-400 text-xs">{expanded === sol.id ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Detalhes expandidos */}
            {expanded === sol.id && (
              <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50 space-y-4 pt-3">
                {/* Dados da vaga */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Modalidade</p>
                    <p className="text-sm font-medium">{sol.modalidade}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Horário</p>
                    <p className="text-sm font-medium">{sol.horario}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dias de Trabalho</p>
                    <p className="text-sm font-medium">{sol.diasTrabalho}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Carga Horária</p>
                    <p className="text-sm font-medium">{sol.cargaHoraria || 30}h/semana</p>
                  </div>
                  {sol.auxTransporte > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Auxílio Transporte</p>
                      <p className="text-sm font-medium">R$ {Number(sol.auxTransporte).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Curso Desejado</p>
                    <p className="text-sm font-medium">{sol.cursoDesejado || "Indiferente"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preferência Gênero</p>
                    <p className="text-sm font-medium">{generoLabel[sol.preferenciaGenero] || "Indiferente"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nível de Ensino</p>
                    <p className="text-sm font-medium">{sol.nivel ? nivelLabel[sol.nivel] : "Indiferente"}</p>
                  </div>
                </div>

                {/* Atividades */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Atividades</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white border border-slate-200 rounded-lg px-3 py-2">{sol.atividades}</p>
                </div>

                {/* Benefícios */}
                {sol.beneficios && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Benefícios</p>
                    <p className="text-sm text-slate-700">{sol.beneficios}</p>
                  </div>
                )}

                {/* Supervisor */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">👤 Supervisor</p>
                  <p className="text-sm font-bold text-slate-800">{sol.supervisorNome}{sol.supervisorCargo ? ` — ${sol.supervisorCargo}` : ""}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sol.supervisorEmail && <span>{sol.supervisorEmail}&nbsp;&nbsp;</span>}
                    {sol.supervisorTel && <span>{sol.supervisorTel}</span>}
                  </p>
                </div>

                {/* Observações */}
                {sol.observacoes && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Observações</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{sol.observacoes}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button variant="secondary" onClick={() => verPdf(sol.id)}>
                    🖨️ Imprimir / PDF
                  </Button>
                  {sol.status === "PENDENTE" && (
                    <>
                      <Button onClick={() => abrirVaga(sol.id)} disabled={loading === sol.id}>
                        {loading === sol.id ? "Abrindo..." : "✅ Abrir como Vaga"}
                      </Button>
                      <Button variant="danger" onClick={() => rejeitar(sol.id)} disabled={loading === sol.id}>
                        ❌ Rejeitar
                      </Button>
                    </>
                  )}
                  {sol.status === "CONVERTIDA" && sol.vagaId && (
                    <a href={`/dashboard/vagas/${sol.vagaId}`} className="text-xs text-blue-500 hover:underline self-center">
                      Ver Vaga →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
