"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AIButton } from "@/components/ai/AIButton";
import Link from "next/link";

const AREAS = ["Administrativo","Comercial","Contabilidade","Design","Engenharia","Financeiro","Jurídico","Logística","Marketing","Recursos Humanos","Tecnologia","Saúde","Outro"];

export default function NovaVagaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testesIA, setTestesIA] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState({
    titulo:"", funcao:"", area:"", descricao:"", requisitos:"",
    beneficios:"Auxílio Transporte", modalidade:"Presencial",
    bolsa:"", auxTransporte:"200", cargaHoraria:"30", chDiaria:"6",
    horario:"08:00 - 14:00", cidade:"", uf:"",
    discDesejado:"", companyId:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    fetch("/api/app/empresas").then(r=>r.json()).then(d=>setCompanies(d.empresas||[]));
  },[]);

  const handleSubmit = async () => {
    if (!form.titulo||!form.companyId||!form.bolsa) { setError("Preencha: Título, Empresa e Bolsa."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/app/vagas", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          ...form,
          bolsa: parseFloat(form.bolsa),
          auxTransporte: form.auxTransporte ? parseFloat(form.auxTransporte) : null,
          cargaHoraria: parseInt(form.cargaHoraria),
          chDiaria: parseInt(form.chDiaria),
        }),
      });
      const data = await res.json();
      if (!res.ok||data.error) { setError(data.error||"Erro ao criar vaga."); return; }
      router.push(`/dashboard/vagas/${data.vaga.id}`);
      router.refresh();
    } catch (e: any) {
      setError("Erro de conexão ao publicar vaga. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Payloads para IA
  const selectedCompany = companies.find(c => c.id === form.companyId);
  const aiDescricaoPayload = {
    titulo: form.titulo, funcao: form.funcao, area: form.area,
    bolsa: form.bolsa, horario: form.horario, modalidade: form.modalidade,
    requisitos: form.requisitos, empresa: selectedCompany?.name || "",
    cidade: form.cidade, uf: form.uf,
  };
  const aiTestesPayload = {
    titulo: form.titulo, area: form.area,
    requisitos: form.requisitos, descricao: form.descricao,
  };
  const aiRequisitosPayload = {
    titulo: form.titulo, area: form.area, descricao: form.descricao,
  };
  const aiDiscPayload = {
    titulo: form.titulo, area: form.area,
    descricao: form.descricao, requisitos: form.requisitos, modalidade: form.modalidade,
  };

  const downloadTestesPDF = () => {
    if (!testesIA) return;
    const content = testesIA
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/### (.*)/g, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Testes Seletivos — ${form.titulo}</title>
<style>
  body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1e293b}
  h1{color:#0f2a5e;border-bottom:2px solid #0f2a5e;padding-bottom:10px}
  h3{color:#1a3d8f;margin-top:24px}
  .meta{color:#64748b;font-size:14px;margin-bottom:24px}
  strong{font-weight:bold}
  @media print{body{padding:20px}}
</style></head><body>
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
            <div className="col-span-2"><Input label="Título da Vaga *" value={form.titulo} onChange={e=>set("titulo",e.target.value)} placeholder="Assistente Administrativo Jr"/></div>
            <Input label="Função" value={form.funcao} onChange={e=>set("funcao",e.target.value)} placeholder="Assistente"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Área</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.area} onChange={e=>set("area",e.target.value)}>
                <option value="">Selecione...</option>
                {AREAS.map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Empresa *</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.companyId} onChange={e=>set("companyId",e.target.value)}>
                <option value="">Selecione...</option>
                {companies.filter((c:any)=>c.status==="ATIVA").map((c:any)=><option key={c.id} value={c.id}>{c.name} — {c.cidade}/{c.uf}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Modalidade</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.modalidade} onChange={e=>set("modalidade",e.target.value)}>
                {["Presencial","Híbrido","Remoto"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Módulo 5 — Perfil DISC Ideal */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Perfil DISC desejado</label>
              <div className="flex gap-2 items-center">
                <select className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.discDesejado} onChange={e=>set("discDesejado",e.target.value)}>
                  <option value="">Qualquer perfil</option>
                  {[["D","Dominância"],["I","Influência"],["S","Estabilidade"],["C","Conformidade"]].map(([v,l])=><option key={v} value={v}>{v} — {l}</option>)}
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

            {/* Módulo 1 — Gerar Descrição com IA */}
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
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none" value={form.descricao} onChange={e=>set("descricao",e.target.value)} placeholder="Atividades que o estagiário irá desenvolver..."/>
            </div>

            {/* Requisitos com Sugerir Requisitos */}
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
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none" value={form.requisitos} onChange={e=>set("requisitos",e.target.value)} placeholder="Cursando Administração ou áreas correlatas..."/>
            </div>

            {/* Sugestão de Testes Seletivos — uso interno, não vai para a vaga */}
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
                    <button
                      type="button"
                      onClick={downloadTestesPDF}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
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
            <Input label="Bolsa (R$) *" type="number" value={form.bolsa} onChange={e=>set("bolsa",e.target.value)} placeholder="1500"/>
            <Input label="Aux. Transporte (R$)" type="number" value={form.auxTransporte} onChange={e=>set("auxTransporte",e.target.value)} placeholder="200"/>
            <Input label="Benefícios" value={form.beneficios} onChange={e=>set("beneficios",e.target.value)}/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">C.H. Diária (máx. 6h)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.chDiaria}
                onChange={e=>{ set("chDiaria",e.target.value); set("cargaHoraria",String(parseInt(e.target.value)*5)); }}>
                {["4","5","6"].map(h=><option key={h} value={h}>{h}h/dia</option>)}
              </select>
            </div>
            <Input label="C.H. Semanal" value={form.cargaHoraria+"h"} readOnly className="bg-slate-50"/>
            <Input label="Horário" value={form.horario} onChange={e=>set("horario",e.target.value)} placeholder="08:00 - 14:00"/>
            <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
            <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP"/>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={()=>router.back()}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading?"Publicando...":"Publicar Vaga"}</Button>
        </div>
      </div>
    </div>
  );
}
