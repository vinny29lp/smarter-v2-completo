"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarDays, Plus, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

const TIPO_LABEL: Record<string, string> = {
  PUBLICACAO:       "📸 Publicação",
  DATA_COMEMORATIVA:"🎉 Data especial",
  CAMPANHA:         "📣 Campanha",
  REUNIAO:          "🤝 Reunião",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarioPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "FRANQUEADORA";

  const hoje = new Date();
  const [mes, setMes]     = useState(hoje.getMonth() + 1);
  const [ano, setAno]     = useState(hoje.getFullYear());
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    titulo: "", descricao: "", data: "", tipo: "PUBLICACAO", cor: "#0D2B5C", recorrente: false,
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/app/marketing/calendario?mes=${mes}&ano=${ano}`);
    const data = await res.json();
    setEventos(data.eventos || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [mes, ano]);

  async function salvar() {
    if (!form.titulo || !form.data) return;
    setSaving(true);
    await fetch("/api/app/marketing/calendario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ titulo: "", descricao: "", data: "", tipo: "PUBLICACAO", cor: "#0D2B5C", recorrente: false });
    load();
  }

  function navMes(delta: number) {
    let nm = mes + delta;
    let na = ano;
    if (nm < 1) { nm = 12; na--; }
    if (nm > 12) { nm = 1;  na++; }
    setMes(nm);
    setAno(na);
  }

  // Gera os dias do mês para a grade
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes   = new Date(ano, mes, 0).getDate();
  const celulas     = Array.from({ length: primeiroDia + diasNoMes }, (_, i) => {
    if (i < primeiroDia) return null;
    return i - primeiroDia + 1;
  });

  // Mapear eventos por dia
  const eventosPorDia: Record<number, any[]> = {};
  for (const ev of eventos) {
    const d = new Date(ev.data).getDate();
    if (!eventosPorDia[d]) eventosPorDia[d] = [];
    eventosPorDia[d].push(ev);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Calendário Editorial</h2>
          <p className="text-sm text-slate-500">Planejamento de publicações e datas comemorativas</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors">
            <Plus size={15} /> Novo evento
          </button>
        )}
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={() => navMes(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <span className="font-black text-slate-800">{MESES[mes - 1]} {ano}</span>
          <button onClick={() => navMes(1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400">{d}</div>
          ))}
        </div>

        {/* Grade do calendário */}
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-7">
            {celulas.map((dia, i) => {
              if (!dia) return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-50" />;
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
              const evs = eventosPorDia[dia] || [];
              return (
                <div key={dia}
                  className={clsx("min-h-[80px] border-b border-r border-slate-50 p-1.5 transition-colors",
                    isHoje ? "bg-[#F4B400]/10" : "hover:bg-slate-50/50")}>
                  <span className={clsx("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                    isHoje ? "bg-[#F4B400] text-[#0D2B5C]" : "text-slate-600")}>
                    {dia}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {evs.slice(0, 3).map(ev => (
                      <div key={ev.id}
                        className="text-[9px] font-semibold rounded px-1 py-0.5 truncate text-white"
                        style={{ backgroundColor: ev.cor || ev.campanha?.cor || "#0D2B5C" }}
                        title={ev.titulo}>
                        {ev.titulo}
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <div className="text-[9px] text-slate-400 px-1">+{evs.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de eventos do mês */}
      {eventos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-sm">
              {eventos.length} evento{eventos.length !== 1 ? "s" : ""} em {MESES[mes - 1]}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {eventos.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ backgroundColor: ev.cor || ev.campanha?.cor || "#0D2B5C" }}>
                  {new Date(ev.data).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{ev.titulo}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{TIPO_LABEL[ev.tipo] || ev.tipo}</span>
                    {ev.campanha && <span>· {ev.campanha.nome}</span>}
                    {ev.recorrente && <span>· 🔄 Recorrente</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {new Date(ev.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal novo evento */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800">Novo Evento</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Ex: Post Dia do Estagiário" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Data *</label>
                  <input type="datetime-local" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={2} placeholder="Detalhes sobre o evento" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Cor</label>
                  <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={form.recorrente} onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#0D2B5C]" />
                  <span className="text-sm text-slate-700">Evento recorrente (anual)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.titulo || !form.data || saving}
                className="flex-1 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Salvando..." : <><Check size={14} /> Criar evento</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
