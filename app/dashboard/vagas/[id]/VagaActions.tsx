"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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

interface Props {
  vaga: VagaData;
}

const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];
const NIVEIS = ["", "Ensino Médio", "Técnico", "Superior"];
const DISCS = ["", "D", "I", "S", "C"];

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

  // Form state — pré-preenchido com os dados da vaga
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
    nivel: vaga.nivel || "",
    cursoRequerido: vaga.cursoRequerido || "",
    discDesejado: vaga.discDesejado || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const changeStatus = async (s: string) => {
    setLoading(true);
    await fetch(`/api/app/vagas/${vaga.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }),
    });
    router.refresh();
    setLoading(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    setEditError("");
    try {
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
        nivel: form.nivel || null,
        cursoRequerido: form.cursoRequerido.trim() || null,
        discDesejado: form.discDesejado || null,
      };
      const res = await fetch(`/api/app/vagas/${vaga.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Erro ao salvar.");
        return;
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
      {/* Botão Editar */}
      <Button
        variant="secondary"
        className="w-full justify-center"
        onClick={() => { setEditModal(true); setEditError(""); }}
      >
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

      {/* Modal Link de Divulgação */}
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

      {/* Modal Editar Vaga */}
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
              <input className={inputCls} value={form.funcao} onChange={set("funcao")} placeholder="Ex: Analista" />
            </div>
            <div>
              <label className={labelCls}>Área</label>
              <input className={inputCls} value={form.area} onChange={set("area")} placeholder="Ex: Tecnologia" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea className={inputCls + " min-h-[80px] resize-y"} value={form.descricao} onChange={set("descricao")} placeholder="Descreva as atividades da vaga..." />
          </div>

          {/* Requisitos */}
          <div>
            <label className={labelCls}>Requisitos</label>
            <textarea className={inputCls + " min-h-[60px] resize-y"} value={form.requisitos} onChange={set("requisitos")} placeholder="Quais requisitos o candidato precisa ter?" />
          </div>

          {/* Benefícios e Modalidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Benefícios</label>
              <input className={inputCls} value={form.beneficios} onChange={set("beneficios")} placeholder="Ex: Vale-refeição" />
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
              <input className={inputCls} type="number" value={form.bolsa} onChange={set("bolsa")} placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls}>Aux. Transporte (R$)</label>
              <input className={inputCls} type="number" value={form.auxTransporte} onChange={set("auxTransporte")} placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls}>C.H. Semanal (h) *</label>
              <input className={inputCls} type="number" value={form.cargaHoraria} onChange={set("cargaHoraria")} placeholder="20" />
            </div>
          </div>

          {/* Horário, Dias e C.H. diária */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Horário</label>
              <input className={inputCls} value={form.horario} onChange={set("horario")} placeholder="Ex: 08:00 - 14:00" />
            </div>
            <div>
              <label className={labelCls}>C.H. Diária (h) *</label>
              <input className={inputCls} type="number" value={form.chDiaria} onChange={set("chDiaria")} placeholder="4" />
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
              <input className={inputCls} value={form.cidade} onChange={set("cidade")} placeholder="São Paulo" />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input className={inputCls} value={form.uf} onChange={set("uf")} placeholder="SP" maxLength={2} />
            </div>
          </div>

          {/* Nível, Curso e DISC */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Nível de Ensino</label>
              <select className={inputCls} value={form.nivel} onChange={set("nivel")}>
                {NIVEIS.map(n => <option key={n} value={n}>{n || "—"}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Curso Requerido</label>
              <input className={inputCls} value={form.cursoRequerido} onChange={set("cursoRequerido")} placeholder="Ex: Administração" />
            </div>
            <div>
              <label className={labelCls}>DISC desejado</label>
              <select className={inputCls} value={form.discDesejado} onChange={set("discDesejado")}>
                {DISCS.map(d => <option key={d} value={d}>{d || "Qualquer"}</option>)}
              </select>
            </div>
          </div>
        </div>

        {editError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
        )}

        <div className="flex gap-2 mt-4">
          <Button onClick={saveEdit} disabled={saving} className="flex-1 justify-center">
            {saving ? "Salvando..." : "💾 Salvar Alterações"}
          </Button>
          <Button variant="secondary" onClick={() => setEditModal(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
