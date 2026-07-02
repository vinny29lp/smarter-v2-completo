"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AIButton } from "@/components/ai/AIButton";
import Link from "next/link";
import {
  NIVEIS_ENSINO,
  CURSOS_TECNICO_LISTA,
  CURSOS_SUPERIOR_LISTA,
} from "@/lib/vagas-constants";

const AREAS = ["Administrativo","Comercial","Contabilidade","Design","Engenharia","Financeiro","Jurídico","Logística","Marketing","Recursos Humanos","Tecnologia","Saúde","Outro"];

const DIAS_OPCOES = [
  "Segunda a Sexta",
  "Segunda a Sábado",
  "Segunda, Quarta e Sexta",
  "Terça e Quinta",
  "Sábado",
  "Personalizado (digitar abaixo)",
];

const chkCls = "w-4 h-4 rounded accent-[#0f2a5e] cursor-pointer flex-shrink-0";

function CursoList({
  lista, selecionados, filtro, setFiltro, onToggle,
  showOutro, onToggleOutro, outroVal, onOutroChange, badgeColor,
}: {
  lista: string[]; selecionados: string[]; filtro: string;
  setFiltro: (v:string)=>void; onToggle:(c:string)=>void;
  showOutro:boolean; onToggleOutro:()=>void; outroVal:string;
  onOutroChange:(v:string)=>void; badgeColor:string;
}) {
  const filtrados = lista.filter(c => c.toLowerCase().includes(filtro.toLowerCase()));
  const selecionadosDaLista = selecionados.filter(c => lista.includes(c));
  return (
    <>
      <input
        type="text"
        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] mb-2"
        placeholder="Filtrar cursos..."
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
      />
      <div className="max-h-44 overflow-y-auto border-2 border-slate-200 rounded-xl p-3 bg-slate-50/50 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {filtrados.map(c => (
          <label key={c} className="flex items-start gap-1.5 cursor-pointer select-none">
            <input type="checkbox" className={chkCls} checked={selecionados.includes(c)} onChange={() => onToggle(c)} />
            <span className="text-xs text-slate-700 leading-tight">
              {c.startsWith("Técnico em ") ? c.replace("Técnico em ", "") : c}
            </span>
          </label>
        ))}
        {(!filtro || "outro".includes(filtro.toLowerCase())) && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" className={chkCls} checked={showOutro} onChange={onToggleOutro} />
            <span className="text-xs text-slate-700 font-semibold">Outro</span>
          </label>
        )}
      </div>
      {showOutro && (
        <input
          type="text"
          className="mt-2 w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
          placeholder="Informe o curso..."
          value={outroVal}
          onChange={e => onOutroChange(e.target.value)}
        />
      )}
      {selecionadosDaLista.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selecionadosDaLista.map(c => (
            <span key={c} className={`inline-flex items-center gap-1 px-2 py-0.5 ${badgeColor} text-xs rounded-full`}>
              {c.startsWith("Técnico em ") ? c.replace("Técnico em ", "") : c}
              <button type="button" onClick={() => onToggle(c)} className="opacity-60 hover:opacity-100 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}

export default function NovaVagaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testesIA, setTestesIA] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);

  // Nível de ensino — multi-select
  const [niveis, setNiveis] = useState<string[]>([]);
  // Cursos — multi-select (unificado para Técnico e Superior)
  const [cursosSelecionados, setCursosSelecionados] = useState<string[]>([]);
  const [showOutroTecnico, setShowOutroTecnico] = useState(false);
  const [showOutroSuperior, setShowOutroSuperior] = useState(false);
  const [cursoOutroTecnico, setCursoOutroTecnico] = useState("");
  const [cursoOutroSuperior, setCursoOutroSuperior] = useState("");
  const [filtroCursoTecnico, setFiltroCursoTecnico] = useState("");
  const [filtroCursoSuperior, setFiltroCursoSuperior] = useState("");

  // Dias da semana
  const [diasPersonalizado, setDiasPersonalizado] = useState(false);

  const [form, setForm] = useState({
    titulo:"", funcao:"", area:"", descricao:"", requisitos:"",
    beneficios:"Auxílio Transporte", modalidade:"Presencial",
    bolsa:"", auxTransporte:"200", cargaHoraria:"30", chDiaria:"6",
    horario:"08:00 - 14:00", diasSemana:"Segunda a Sexta",
    cidade:"", uf:"", discDesejado:"", companyId:"",
  });
  const set = (k:string, v:string) => setForm(p => ({ ...p, [k]: v }));

  const toggleNivel = (nivel: string) => {
    setNiveis(prev => {
      if (prev.includes(nivel)) {
        // Desmarca: remove também os cursos deste nível
        const listaDoNivel = nivel === "Ensino Técnico" ? CURSOS_TECNICO_LISTA
                           : nivel === "Ensino Superior" ? CURSOS_SUPERIOR_LISTA : [];
        setCursosSelecionados(cs => cs.filter(c => !listaDoNivel.includes(c)));
        if (nivel === "Ensino Técnico") { setShowOutroTecnico(false); setCursoOutroTecnico(""); setFiltroCursoTecnico(""); }
        if (nivel === "Ensino Superior") { setShowOutroSuperior(false); setCursoOutroSuperior(""); setFiltroCursoSuperior(""); }
        return prev.filter(n => n !== nivel);
      }
      return [...prev, nivel];
    });
  };

  const toggleCurso = (curso: string) =>
    setCursosSelecionados(prev => prev.includes(curso) ? prev.filter(c => c !== curso) : [...prev, curso]);

  useEffect(() => {
    fetch("/api/app/empresas").then(r => r.json()).then(d => setCompanies(d.empresas || []));
  }, []);

  const handleSubmit = async () => {
    if (!form.titulo || !form.companyId || !form.bolsa) {
      setError("Preencha: Título, Empresa e Bolsa."); return;
    }
    setLoading(true); setError("");
    try {
      const cursosFinais = [
        ...cursosSelecionados,
        ...(showOutroTecnico && cursoOutroTecnico.trim() ? [cursoOutroTecnico.trim()] : []),
        ...(showOutroSuperior && cursoOutroSuperior.trim() ? [cursoOutroSuperior.trim()] : []),
      ];
      const res = await fetch("/api/app/vagas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nivel: niveis.length ? JSON.stringify(niveis) : null,
          cursoRequerido: cursosFinais.length ? JSON.stringify(cursosFinais) : null,
          bolsa: parseFloat(form.bolsa),
          auxTransporte: form.auxTransporte ? parseFloat(form.auxTransporte) : null,
          cargaHoraria: parseInt(form.cargaHoraria),
          chDiaria: parseInt(form.chDiaria),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Erro ao criar vaga."); return; }
      router.push(`/dashboard/vagas/${data.vaga.id}`);
      router.refresh();
    } catch {
      setError("Erro de conexão ao publicar vaga. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Payloads para IA
  const selectedCompany = companies.find(c => c.id === form.companyId);
  const nivelDisplay = niveis.join(", ") || "";
  const cursoDisplay = cursosSelecionados.join(", ") || "";
  const aiDescricaoPayload = {
    titulo: form.titulo, funcao: form.funcao, area: form.area,
    nivel: nivelDisplay, cursoRequerido: cursoDisplay,
    bolsa: form.bolsa, horario: form.horario, modalidade: form.modalidade,
    requisitos: form.requisitos, empresa: selectedCompany?.name || "",
    cidade: form.cidade, uf: form.uf,
  };
  const aiRequisitosPayload = { titulo: form.titulo, area: form.area, nivel: nivelDisplay, cursoRequerido: cursoDisplay, descricao: form.descricao };
  const aiTestesPayload = { titulo: form.titulo, area: form.area, nivel: nivelDisplay, cursoRequerido: cursoDisplay, requisitos: form.requisitos, descricao: form.descricao };
  const aiDiscPayload = { titulo: form.titulo, area: form.area, descricao: form.descricao, requisitos: form.requisitos, modalidade: form.modalidade };

  const downloadTestesPDF = () => {
    if (!testesIA) return;
    const content = testesIA
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/### (.*)/g, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Testes Seletivos — ${form.titulo}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1e293b}h1{color:#0f2a5e;border-bottom:2px solid #0f2a5e;padding-bottom:10px}h3{color:#1a3d8f;margin-top:24px}.meta{color:#64748b;font-size:14px;margin-bottom:24px}strong{font-weight:bold}@media print{body{padding:20px}}</style>
</head><body>
<h1>Testes Seletivos Sugeridos</h1>
<div class="meta"><strong>Vaga:</strong> ${form.titulo}&nbsp;|&nbsp;<strong>Área:</strong> ${form.area||"—"}</div>
<div>${content}</div>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/vagas" className="text-slate-400 hover:text-slate-600 text-sm">← Vagas</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Nova Vaga</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <div className="max-w-3xl space-y-5">
        <Card className="p-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Dados da Vaga</p>
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <Input label="Título da Vaga *" value={form.titulo} onChange={e => set("titulo", e.target.value)} placeholder="Assistente Administrativo Jr"/>
            </div>

            <Input label="Função" value={form.funcao} onChange={e => set("funcao", e.target.value)} placeholder="Assistente"/>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Área</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.area} onChange={e => set("area", e.target.value)}>
                <option value="">Selecione...</option>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* ── Nível de Ensino — multi-select (Lei 11.788/08) ── */}
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-2">
                Nível de Ensino <span className="text-slate-400 font-normal">(Lei 11.788/08) — selecione um ou mais</span>
              </label>
              <div className="flex flex-wrap gap-6">
                {NIVEIS_ENSINO.map(n => (
                  <label key={n} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className={chkCls} checked={niveis.includes(n)} onChange={() => toggleNivel(n)} />
                    <span className="text-sm text-slate-700 font-medium">{n}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Cursos Técnicos ── */}
            {niveis.includes("Ensino Técnico") && (
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Cursos Técnicos
                  {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-[#0f2a5e] text-white text-[10px] rounded-full">
                      {cursosSelecionados.filter(c => CURSOS_TECNICO_LISTA.includes(c)).length} selecionados
                    </span>
                  )}
                </label>
                <CursoList
                  lista={CURSOS_TECNICO_LISTA}
                  selecionados={cursosSelecionados}
                  filtro={filtroCursoTecnico}
                  setFiltro={setFiltroCursoTecnico}
                  onToggle={toggleCurso}
                  showOutro={showOutroTecnico}
                  onToggleOutro={() => setShowOutroTecnico(p => !p)}
                  outroVal={cursoOutroTecnico}
                  onOutroChange={setCursoOutroTecnico}
                  badgeColor="bg-blue-50 border border-blue-200 text-blue-700"
                />
              </div>
            )}

            {/* ── Cursos Superiores ── */}
            {niveis.includes("Ensino Superior") && (
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Cursos Superiores
                  {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-[#0f2a5e] text-white text-[10px] rounded-full">
                      {cursosSelecionados.filter(c => CURSOS_SUPERIOR_LISTA.includes(c)).length} selecionados
                    </span>
                  )}
                </label>
                <CursoList
                  lista={CURSOS_SUPERIOR_LISTA}
                  selecionados={cursosSelecionados}
                  filtro={filtroCursoSuperior}
                  setFiltro={setFiltroCursoSuperior}
                  onToggle={toggleCurso}
                  showOutro={showOutroSuperior}
                  onToggleOutro={() => setShowOutroSuperior(p => !p)}
                  outroVal={cursoOutroSuperior}
                  onOutroChange={setCursoOutroSuperior}
                  badgeColor="bg-purple-50 border border-purple-200 text-purple-700"
                />
              </div>
            )}

            {/* Empresa e Modalidade */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Empresa *</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.companyId} onChange={e => set("companyId", e.target.value)}>
                <option value="">Selecione...</option>
                {companies.filter((c:any) => c.status === "ATIVA").map((c:any) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.cidade}/{c.uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Modalidade</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.modalidade} onChange={e => set("modalidade", e.target.value)}>
                {["Presencial","Híbrido","Remoto"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Perfil DISC */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Perfil DISC desejado</label>
              <div className="flex gap-2 items-center">
                <select className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.discDesejado} onChange={e => set("discDesejado", e.target.value)}>
                  <option value="">Qualquer perfil</option>
                  {[["D","Dominância"],["I","Influência"],["S","Estabilidade"],["C","Conformidade"]].map(([v,l]) => (
                    <option key={v} value={v}>{v} — {l}</option>
                  ))}
                </select>
                <AIButton
                  label="DISC Ideal"
                  endpoint="/api/app/ai/disc-perfil"
                  payload={aiDiscPayload}
                  resultLabel="Perfil DISC Recomendado"
                  disabled={!form.titulo}
                  onResult={(text) => {
                    const match = text.match(/\bperfil\s+([DISC])\b/i) || text.match(/^([DISC])\b/);
                    if (match) set("discDesejado", match[1].toUpperCase());
                  }}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Descrição da Vaga</label>
                <AIButton
                  label="Gerar descrição com IA"
                  endpoint="/api/app/ai/vaga-descricao"
                  payload={aiDescricaoPayload}
                  resultLabel="Descrição gerada pela IA"
                  disabled={!form.titulo}
                  onResult={(text) => set("descricao", text)}
                />
              </div>
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none" value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Atividades que o estagiário irá desenvolver..."/>
            </div>

            {/* Requisitos */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Requisitos</label>
                <AIButton
                  label="Sugerir Requisitos"
                  endpoint="/api/app/ai/sugestao-requisitos"
                  payload={aiRequisitosPayload}
                  resultLabel="Requisitos sugeridos pela IA"
                  disabled={!form.titulo}
                  onResult={(text) => set("requisitos", form.requisitos ? form.requisitos + "\n\n" + text : text)}
                />
              </div>
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none" value={form.requisitos} onChange={e => set("requisitos", e.target.value)} placeholder="Cursando Administração ou áreas correlatas..."/>
            </div>

            {/* Testes Seletivos */}
            <div className="col-span-2">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-xs font-bold text-slate-600">Sugestão de Testes Seletivos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Apenas para uso interno da unidade — não aparece na divulgação da vaga</p>
                  </div>
                  <AIButton
                    label="Sugerir Testes Seletivos"
                    endpoint="/api/app/ai/sugestao-testes"
                    payload={aiTestesPayload}
                    resultLabel="Testes sugeridos pela IA"
                    disabled={!form.titulo}
                    onResult={(text) => setTestesIA(text)}
                  />
                </div>
                {testesIA && (
                  <div className="mt-3 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-medium">✓ Testes gerados — apenas para uso interno da unidade</p>
                    <button type="button" onClick={downloadTestesPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors">
                      📄 Baixar PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Remuneração e Jornada</p>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Bolsa (R$) *" type="number" value={form.bolsa} onChange={e => set("bolsa", e.target.value)} placeholder="1500"/>
            <Input label="Aux. Transporte (R$)" type="number" value={form.auxTransporte} onChange={e => set("auxTransporte", e.target.value)} placeholder="200"/>
            <Input label="Benefícios" value={form.beneficios} onChange={e => set("beneficios", e.target.value)}/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">C.H. Diária (máx. 6h)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.chDiaria}
                onChange={e => { set("chDiaria", e.target.value); set("cargaHoraria", String(parseInt(e.target.value) * 5)); }}>
                {["4","5","6"].map(h => <option key={h} value={h}>{h}h/dia</option>)}
              </select>
            </div>
            <Input label="C.H. Semanal" value={form.cargaHoraria + "h"} readOnly className="bg-slate-50"/>
            <Input label="Horário" value={form.horario} onChange={e => set("horario", e.target.value)} placeholder="08:00 - 14:00"/>
            <div className="col-span-3">
              <label className="text-xs font-bold text-slate-600 block mb-1">Dias da Semana</label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={diasPersonalizado ? "Personalizado (digitar abaixo)" : form.diasSemana}
                onChange={e => {
                  if (e.target.value === "Personalizado (digitar abaixo)") {
                    setDiasPersonalizado(true); set("diasSemana", "");
                  } else {
                    setDiasPersonalizado(false); set("diasSemana", e.target.value);
                  }
                }}
              >
                <option value="">Selecione...</option>
                {DIAS_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {diasPersonalizado && (
                <input
                  type="text"
                  className="mt-2 w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                  placeholder="Ex: Segunda, Quarta e Sábado"
                  value={form.diasSemana}
                  onChange={e => set("diasSemana", e.target.value)}
                />
              )}
            </div>
            <Input label="Cidade" value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="São Paulo"/>
            <Input label="UF" value={form.uf} onChange={e => set("uf", e.target.value)} placeholder="SP"/>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Publicando..." : "Publicar Vaga"}</Button>
        </div>
      </div>
    </div>
  );
}
