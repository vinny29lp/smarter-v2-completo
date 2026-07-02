"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NIVEIS_ENSINO, CURSOS_TECNICO_LISTA, CURSOS_SUPERIOR_LISTA, parseMultiField } from "@/lib/vagas-constants";

interface VagaData {
  id: string;
  titulo: string;
  funcao?: string | null;
  area?: string | null;
  descricao?: string | null;
  requisitos?: string | null;
  beneficios?: string | null;
  modalidade?: string | null;
  bolsa: number;
  auxTransporte?: number | null;
  cargaHoraria?: number | null;
  chDiaria?: number | null;
  horario?: string | null;
  diasSemana?: string | null;
  cidade?: string | null;
  uf?: string | null;
  discDesejado?: string | null;
  nivel?: string | null;
  cursoRequerido?: string | null;
  status: string;
  publicSlug?: string | null;
}

interface Props { vaga: VagaData; }

const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];
const DISCS = ["", "D", "I", "S", "C"];
const chkCls = "w-4 h-4 rounded accent-[#0f2a5e] cursor-pointer flex-shrink-0";

export function VagaActions({ vaga }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const linkPublico = vaga.publicSlug ? `${base}/vaga/${vaga.publicSlug}` : null;

  // Nível e cursos — multi-select (pré-preenchido com valores existentes)
  const [niveis, setNiveis] = useState<string[]>(() => parseMultiField(vaga.nivel));
  const [cursosSelecionados, setCursosSelecionados] = useState<string[]>(() => parseMultiField(vaga.cursoRequerido));
  const [showOutroTecnico, setShowOutroTecnico] = useState(false);
  const [showOutroSuperior, setShowOutroSuperior] = useState(false);
  const [cursoOutroTecnico, setCursoOutroTecnico] = useState("");
  const [cursoOutroSuperior, setCursoOutroSuperior] = useState("");
  const [filtroCursoTecnico, setFiltroCursoTecnico] = useState("");
  const [filtroCursoSuperior, setFiltroCursoSuperior] = useState("");

  const [form, setForm] = useState({
    titulo: vaga.titulo || "",
    funcao: vaga.funcao || "",
    area: vaga.area || "",
    descricao: vaga.descricao || "",
    requisitos: vaga.requisitos || "",
    beneficios: vaga.beneficios || "",
    modalidade: vaga.modalidade || "Presencial",
    bolsa: String(vaga.bolsa ?? ""),
    auxTransporte: String(vaga.auxTransporte ?? ""),
    cargaHoraria: String(vaga.cargaHoraria ?? ""),
    chDiaria: String(vaga.chDiaria ?? ""),
    horario: vaga.horario || "",
    diasSemana: vaga.diasSemana || "",
    cidade: vaga.cidade || "",
    uf: vaga.uf || "",
    discDesejado: vaga.discDesejado || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleNivel = (nivel: string) => {
    setNiveis(prev => {
      if (prev.includes(nivel)) {
        const lista = nivel === "Ensino Técnico" ? CURSOS_TECNICO_LISTA
                    : nivel === "Ensino Superior" ? CURSOS_SUPERIOR_LISTA : [];
        setCursosSelecionados(cs => cs.filter(c => !lista.includes(c)));
        if (nivel === "Ensino Técnico") { setShowOutroTecnico(false); setCursoOutroTecnico(""); setFiltroCursoTecnico(""); }
        if (nivel === "Ensino Superior") { setShowOutroSuperior(false); setCursoOutroSuperior(""); setFiltroCursoSuperior(""); }
        return prev.filter(n => n !== nivel);
      }
      return [...prev, nivel];
    });
  };

  const toggleCurso = (curso: string) =>
    setCursosSelecionados(prev => prev.includes(curso) ? prev.filter(c => c !== curso) : [...prev, curso]);

  const changeStatus = async (s: string) => {
    setLoading(true);
    await fetch(`/api/app/vagas/${vaga.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }),
    });
    router.refresh();
    setLoading(false);
  };

  const saveEdit = async () => {
    setSaving(true); setEditError("");
    try {
      const cursosFinais = [
        ...cursosSelecionados,
        ...(showOutroTecnico && cursoOutroTecnico.trim() ? [cursoOutroTecnico.trim()] : []),
        ...(showOutroSuperior && cursoOutroSuperior.trim() ? [cursoOutroSuperior.trim()] : []),
      ];
      const body = {
        titulo: form.titulo.trim(),
        funcao: form.funcao.trim() || null,
        area: form.area.trim() || null,
        descricao: form.descricao.trim() || null,
        requisitos: form.requisitos.trim() || null,
        beneficios: form.beneficios.trim() || null,
        modalidade: form.modalidade,
        bolsa: parseFloat(form.bolsa) || 0,
        auxTransporte: form.auxTransporte ? parseFloat(form.auxTransporte) : null,
        cargaHoraria: parseInt(form.cargaHoraria) || 0,
        chDiaria: parseInt(form.chDiaria) || 0,
        horario: form.horario.trim() || null,
        diasSemana: form.diasSemana.trim() || null,
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim().toUpperCase().slice(0, 2) || null,
        discDesejado: form.discDesejado || null,
        nivel: niveis.length ? JSON.stringify(niveis) : null,
        cursoRequerido: cursosFinais.length ? JSON.stringify(cursosFinais) : null,
      };
      const res = await fetch(`/api/app/vagas/${vaga.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Erro ao salvar."); return;
      }
      setEditModal(false);
      router.refresh();
    } catch {
      setEditError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    if (linkPublico) navigator.clipboard.writeText(linkPublico);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs text-slate-500 mb-1 font-medium";

  return (
    <div className="space-y-2">
      <Button variant="secondary" className="w-full justify-center" onClick={() => { setEditModal(true); setEditError(""); }}>
        ✏️ Editar Vaga
      </Button>

      {linkPublico && (
        <Button variant="secondary" className="w-full justify-center" onClick={() => setLinkModal(true)}>
          🔗 Link de Divulgação
        </Button>
      )}
      {vaga.status === "ABERTA" && (
        <Button variant="secondary" className="w-full justify-center" onClick={() => changeStatus("PAUSADA")} disabled={loading}>
          ⏸ Pausar Vaga
        </Button>
      )}
      {vaga.status === "PAUSADA" && (
        <Button className="w-full justify-center" onClick={() => changeStatus("ABERTA")} disabled={loading}>
          ▶ Reabrir Vaga
        </Button>
      )}
      {vaga.status !== "ENCERRADA" && (
        <Button variant="danger" className="w-full justify-center" onClick={() => changeStatus("ENCERRADA")} disabled={loading}>
          ✕ Encerrar Vaga
        </Button>
      )}
      {vaga.status === "ENCERRADA" && (
        <Button className="w-full justify-center" onClick={() => changeStatus("ABERTA")} disabled={loading}>
          ↩ Reabrir
        </Button>
      )}

      {/* Modal Link */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Link de Divulgação da Vaga">
        <p className="text-sm text-slate-500 mb-3">Compartilhe este link para candidatos se inscreverem na vaga <strong>{vaga.titulo}</strong>:</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-4 select-all">{linkPublico}</div>
        <div className="flex gap-2">
          <Button onClick={copy} className="flex-1 justify-center">{copied ? "✓ Copiado!" : "📋 Copiar Link"}</Button>
          <Button variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Confira esta vaga de estágio: " + vaga.titulo + " — " + linkPublico)}`)}>
            📱 WhatsApp
          </Button>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Vaga">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

          {/* Título e Função */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Título da Vaga *</label>
              <input className={inputCls} value={form.titulo} onChange={set("titulo")} placeholder="Ex: Estagiário de Marketing" />
            </div>
            <div>
              <label className={labelCls}>Função</label>
              <input className={inputCls} value={form.funcao} onChange={set("funcao")} />
            </div>
            <div>
              <label className={labelCls}>Área</label>
              <input className={inputCls} value={form.area} onChange={set("area")} />
            </div>
          </div>

          {/* Descrição e Requisitos */}
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea className={inputCls + " min-h-[70px] resize-y"} value={form.descricao} onChange={set("descricao")} />
          </div>
          <div>
            <label className={labelCls}>Requisitos</label>
            <textarea className={inputCls + " min-h-[55px] resize-y"} value={form.requisitos} onChange={set("requisitos")} />
          </div>

          {/* Benefícios e Modalidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Benefícios</label>
              <input className={inputCls} value={form.beneficios} onChange={set("beneficios")} />
            </div>
            <div>
              <label className={labelCls}>Modalidade *</label>
              <select className={inputCls} value={form.modalidade} onChange={set("modalidade")}>
                {MODALIDADES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Bolsa (R$) *</label>
              <input className={inputCls} type="number" value={form.bolsa} onChange={set("bolsa")} />
            </div>
            <div>
              <label className={labelCls}>Aux. Transporte (R$)</label>
              <input className={inputCls} type="number" value={form.auxTransporte} onChange={set("auxTransporte")} />
            </div>
            <div>
              <label className={labelCls}>C.H. Semanal (h) *</label>
              <input className={inputCls} type="number" value={form.cargaHoraria} onChange={set("cargaHoraria")} />
            </div>
          </div>

          {/* Horário, Dias e C.H. Diária */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Horário</label>
              <input className={inputCls} value={form.horario} onChange={set("horario")} placeholder="Ex: 08:00 - 14:00" />
            </div>
            <div>
              <label className={labelCls}>C.H. Diária (h) *</label>
              <input className={inputCls} type="number" value={form.chDiaria} onChange={set("chDiaria")} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Dias da Semana</label>
              <input className={inputCls} value={form.diasSemana} onChange={set("diasSemana")} placeholder="Ex: Segunda a Sexta" />
            </div>
          </div>

          {/* Localização */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Cidade</label>
              <input className={inputCls} value={form.cidade} onChange={set("cidade")} />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input className={inputCls} value={form.uf} onChange={set("uf")} maxLength={2} />
            </div>
          </div>

          {/* DISC */}
          <div>
            <label className={labelCls}>Perfil DISC desejado</label>
            <select className={inputCls} value={form.discDesejado} onChange={set("discDesejado")}>
              {DISCS.map(d => <option key={d} value={d}>{d || "Qualquer"}</option>)}
            </select>
          </div>

          {/* Nível de Ensino — multi-select */}
          <div>
            <label className={labelCls}>Nível de Ensino (selecione um ou mais)</label>
            <div className="flex flex-wrap gap-4 mt-1">
              {NIVEIS_ENSINO.map(n => (
                <label key={n} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" className={chkCls} checked={niveis.includes(n)} onChange={() => toggleNivel(n)} />
                  <span className="text-sm text-slate-700">{n}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cursos Técnicos */}
          {niveis.includes("Ensino Técnico") && (
            <div>
              <label className={labelCls}>
                Cursos Técnicos
                {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full">
                    {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).length}
                  </span>
                )}
              </label>
              <input
                type="text"
                className={inputCls + " mb-2"}
                placeholder="Filtrar..."
                value={filtroCursoTecnico}
                onChange={e => setFiltroCursoTecnico(e.target.value)}
              />
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-50">
                {CURSOS_TECNICO_LISTA.filter(c => c.toLowerCase().includes(filtroCursoTecnico.toLowerCase())).map(c => (
                  <label key={c} className="flex items-start gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" className={chkCls} checked={cursosSelecionados.includes(c)} onChange={() => toggleCurso(c)} />
                    <span className="text-xs text-slate-700 leading-tight">{c.replace("Técnico em ", "")}</span>
                  </label>
                ))}
                {(!filtroCursoTecnico || "outro".includes(filtroCursoTecnico.toLowerCase())) && (
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" className={chkCls} checked={showOutroTecnico} onChange={() => setShowOutroTecnico(p => !p)} />
                    <span className="text-xs font-semibold text-slate-700">Outro</span>
                  </label>
                )}
              </div>
              {showOutroTecnico && (
                <input className={inputCls + " mt-1"} value={cursoOutroTecnico} onChange={e => setCursoOutroTecnico(e.target.value)} placeholder="Informe o curso técnico..." />
              )}
              {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full">
                      {c.replace("Técnico em ", "")}
                      <button type="button" onClick={() => toggleCurso(c)} className="opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cursos Superiores */}
          {niveis.includes("Ensino Superior") && (
            <div>
              <label className={labelCls}>
                Cursos Superiores
                {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] rounded-full">
                    {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).length}
                  </span>
                )}
              </label>
              <input
                type="text"
                className={inputCls + " mb-2"}
                placeholder="Filtrar..."
                value={filtroCursoSuperior}
                onChange={e => setFiltroCursoSuperior(e.target.value)}
              />
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-50">
                {CURSOS_SUPERIOR_LISTA.filter(c => c.toLowerCase().includes(filtroCursoSuperior.toLowerCase())).map(c => (
                  <label key={c} className="flex items-start gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" className={chkCls} checked={cursosSelecionados.includes(c)} onChange={() => toggleCurso(c)} />
                    <span className="text-xs text-slate-700 leading-tight">{c}</span>
                  </label>
                ))}
                {(!filtroCursoSuperior || "outro".includes(filtroCursoSuperior.toLowerCase())) && (
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" className={chkCls} checked={showOutroSuperior} onChange={() => setShowOutroSuperior(p => !p)} />
                    <span className="text-xs font-semibold text-slate-700">Outro</span>
                  </label>
                )}
              </div>
              {showOutroSuperior && (
                <input className={inputCls + " mt-1"} value={cursoOutroSuperior} onChange={e => setCursoOutroSuperior(e.target.value)} placeholder="Informe o curso superior..." />
              )}
              {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs rounded-full">
                      {c}
                      <button type="button" onClick={() => toggleCurso(c)} className="opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {editError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
        )}

        <div className="flex gap-2 mt-4">
          <Button onClick={saveEdit} disabled={saving} className="flex-1 justify-center">
            {saving ? "Salvando..." : "💾 Salvar Alterações"}
          </Button>
          <Button variant="secondary" onClick={() => setEditModal(false)} disabled={saving}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
