"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const ACAO_META: Record<string,{label:string;emoji:string}> = {
  login_diario:       {label:"Login diário",        emoji:"🔐"},
  vaga_publicada:     {label:"Vaga publicada",       emoji:"💼"},
  empresa_cadastrada: {label:"Empresa cadastrada",   emoji:"🏢"},
  contrato_criado:    {label:"Contrato criado",      emoji:"📄"},
  lead_convertido:    {label:"Lead convertido",      emoji:"🏆"},
  documento_assinado: {label:"Documento assinado",   emoji:"✍️"},
  followup_crm:       {label:"Follow-up CRM",        emoji:"📞"},
  estudante_aprovado: {label:"Estudante aprovado",   emoji:"🎓"},
};

export default function GamificacaoPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isMaster = role === "FRANQUEADORA";

  const [pontos, setPontos]   = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<any>(null);
  const [editVal, setEditVal]     = useState("");
  const [errEdit, setErrEdit]     = useState("");

  useEffect(() => {
    fetch("/api/app/gamificacao")
      .then(r => r.json())
      .then(d => { setPontos(d.pontos||[]); setConfigs(d.configs||[]); setRanking(d.ranking||[]); });
  }, []);

  const salvarConfig = async () => {
    setErrEdit("");
    const val = parseInt(editVal);
    if (!val || val < 1) { setErrEdit("Informe um valor válido (número inteiro positivo)."); return; }
    const res = await fetch(`/api/app/gamificacao/config/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pontos: val }),
    });
    const data = await res.json();
    if (!res.ok) { setErrEdit(data.error || "Erro ao salvar."); return; }
    setConfigs(p => p.map(c => c.id === editModal.id ? { ...c, pontos: val } : c));
    setEditModal(null);
  };

  const totalPts = pontos.reduce((a: number, b: any) => a + b.pontos, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Gamificação</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isMaster ? "Ranking de todas as unidades e configuração de pontos" : "Pontuação e ranking da sua unidade"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Pontuação da unidade */}
        <Card className="p-5 text-center border-l-4 border-[#f5c400]">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            {isMaster ? "Total da Rede" : "Sua Pontuação"}
          </p>
          <p className="text-4xl font-black text-[#0f2a5e] mt-2">
            {isMaster
              ? ranking.reduce((a: number, r: any) => a + r.total, 0).toLocaleString("pt-BR")
              : totalPts.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-slate-400 mt-1">pontos acumulados</p>
        </Card>

        {/* Tabela de pontos por ação */}
        <Card className="p-5 col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">Pontuação por Ação</h3>
            {isMaster && <span className="text-xs text-blue-500 font-semibold">Clique para editar</span>}
          </div>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Carregando pontuações...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {configs.map((cfg: any) => {
                const meta = ACAO_META[cfg.acao];
                return (
                  <div key={cfg.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isMaster
                        ? "bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-slate-100 cursor-pointer"
                        : "bg-slate-50 border-slate-100"
                    }`}
                    onClick={isMaster ? () => { setEditModal(cfg); setEditVal(String(cfg.pontos)); setErrEdit(""); } : undefined}
                  >
                    <span className="text-xs text-slate-700">{meta?.emoji} {meta?.label || cfg.acao}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">+{cfg.pontos} pts</Badge>
                      {isMaster && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditModal(cfg); setEditVal(String(cfg.pontos)); setErrEdit(""); }}
                          className="text-[10px] text-blue-400 hover:text-blue-600 px-1 py-0.5 rounded hover:bg-blue-100"
                          title="Editar pontuação"
                        >✏️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!isMaster && (
            <p className="text-[10px] text-slate-400 mt-2">
              * Pontuação definida pela Franqueadora.
            </p>
          )}
        </Card>
      </div>

      {/* Ranking — FRANQUEADORA vê todas unidades, FRANQUEADO vê só a própria posição */}
      {ranking.length > 0 && (
        <Card className="p-5 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            🏆 {isMaster ? "Ranking de Todas as Unidades" : "Sua Posição no Ranking"}
          </h3>
          <div className="space-y-2">
            {(isMaster ? ranking : ranking.filter((r: any) => r.franchiseId === session?.user?.franchiseId))
              .map((r: any, i: number) => {
                const pos = ranking.indexOf(r) + 1;
                const maxPts = ranking[0]?.total || 1;
                return (
                  <div key={r.franchiseId || i} className={`flex items-center gap-3 p-3 rounded-xl ${
                    r.franchiseId === session?.user?.franchiseId ? "bg-blue-50 border border-blue-200" : "bg-slate-50"
                  }`}>
                    <span className="text-lg w-8 text-center font-black text-slate-400">
                      {pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {r.name || "—"}
                        {r.franchiseId === session?.user?.franchiseId && (
                          <span className="ml-2 text-[10px] text-blue-500 font-bold">← sua unidade</span>
                        )}
                      </p>
                      <div className="h-1.5 bg-slate-200 rounded-full mt-1">
                        <div className="h-1.5 bg-[#f5c400] rounded-full transition-all"
                          style={{ width: `${Math.round((r.total / maxPts) * 100)}%` }}/>
                      </div>
                    </div>
                    <span className="text-sm font-black text-[#0f2a5e]">
                      {r.total?.toLocaleString("pt-BR")} pts
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Histórico de pontos */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Histórico de Pontos</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {pontos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum ponto registrado ainda.</p>
          ) : pontos.map((p: any) => {
            const meta = ACAO_META[p.acao];
            return (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-xs">
                <span className="text-slate-600">{meta?.emoji} {meta?.label || p.acao}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className="font-black text-emerald-600">+{p.pontos}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal de edição — só aparece para FRANQUEADORA */}
      {isMaster && (
        <Modal open={editModal !== null} onClose={() => setEditModal(null)} title="Editar Pontuação">
          {editModal && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Ação: <strong>{ACAO_META[editModal.acao]?.emoji} {ACAO_META[editModal.acao]?.label || editModal.acao}</strong>
              </p>
              <Input label="Pontos" type="number" value={editVal} onChange={e => setEditVal(e.target.value)}/>
              {errEdit && <p className="text-red-500 text-sm">{errEdit}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
                <Button onClick={salvarConfig}>Salvar</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
