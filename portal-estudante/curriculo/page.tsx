"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Parsers defensivos — campo Json do Prisma pode chegar como qualquer tipo
function toStr(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  return "";
}
function parseHabilidades(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.filter(Boolean).join(", ");
  if (typeof raw === "string") return raw;
  return "";
}
function parseIdiomas(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((i: any) => (i?.idioma || String(i) || "")).filter(Boolean).join(", ");
  if (typeof raw === "string") return raw;
  return "";
}
function parseExp(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((e: any) => (e?.descricao || (typeof e === "string" ? e : JSON.stringify(e)) || "")).filter(Boolean).join("\n\n");
  if (typeof raw === "string") return raw;
  return "";
}

type Aba = "pessoal" | "formacao" | "experiencia" | "habilidades";

export default function EstudanteCurriculo() {
  const [student, setStudent] = useState<any>(null);
  const [aba, setAba] = useState<Aba>("pessoal");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/portal/estudante/perfil")
      .then(r => r.json())
      .then(d => {
        if (!d.student) {
          // Estudante não vinculado — mantém student como null para mostrar mensagem
          setLoading(false);
          return;
        }
        const s = d.student;
        setStudent(s);
        setForm({
          nome:              toStr(s.name),
          cpf:               toStr(s.cpf),
          rg:                toStr(s.rg),
          dataNasc:          s.dataNasc ? String(s.dataNasc).split("T")[0] : "",
          celular:           toStr(s.celular),
          telefone:          toStr(s.telefone),
          email:             toStr(s.email),
          linkedin:          toStr(s.linkedin),
          portfolio:         toStr(s.portfolio),
          endereco:          toStr(s.endereco),
          bairro:            toStr(s.bairro),
          cidade:            toStr(s.cidade),
          uf:                toStr(s.uf),
          cep:               toStr(s.cep),
          curso:             toStr(s.curso),
          periodo:           toStr(s.periodo),
          previsaoConclusao: toStr(s.previsaoConclusao),
          objetivos:         toStr(s.objetivos),
          habilidades:       parseHabilidades(s.habilidades),
          idiomas:           parseIdiomas(s.idiomas),
          experiencias:      parseExp(s.experiencias),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const habilidadesList = (form.habilidades || "").split(",").map(h => h.trim()).filter(Boolean);
      const idiomasList = (form.idiomas || "").split(",").map(i => ({ idioma: i.trim() })).filter(i => i.idioma);
      const raw = (form.experiencias || "").trim();
      const expList = raw ? raw.split("\n\n").filter(Boolean).map(e => ({ descricao: e.trim() })) : [];

      await fetch("/api/portal/estudante/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              form.nome,
          cpf:               form.cpf        || null,
          rg:                form.rg         || null,
          dataNasc:          form.dataNasc   ? new Date(form.dataNasc) : null,
          celular:           form.celular    || null,
          telefone:          form.telefone   || null,
          linkedin:          form.linkedin   || null,
          portfolio:         form.portfolio  || null,
          endereco:          form.endereco   || null,
          bairro:            form.bairro     || null,
          cidade:            form.cidade     || null,
          uf:                form.uf         || null,
          cep:               form.cep        || null,
          curso:             form.curso      || null,
          periodo:           form.periodo    || null,
          previsaoConclusao: form.previsaoConclusao || null,
          objetivos:         form.objetivos  || null,
          habilidades:       habilidadesList,
          idiomas:           idiomasList,
          experiencias:      expList,
        }),
      });
      setMsg("Currículo salvo! ✓");
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setMsg("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>;
  if (!student) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">👤</p>
      <p className="text-slate-600 font-semibold">Perfil de estudante não encontrado</p>
      <p className="text-slate-400 text-sm mt-1">
        Seu perfil ainda não foi vinculado a um estudante. Entre em contato com o consultor Smarter.
      </p>
    </div>
  );

  const ABAS: { key: Aba; label: string }[] = [
    { key: "pessoal",      label: "Dados Pessoais" },
    { key: "formacao",     label: "Formação" },
    { key: "experiencia",  label: "Experiência" },
    { key: "habilidades",  label: "Habilidades" },
  ];

  return (
    <div>
      {msg && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-800">Meu Currículo</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "💾 Salvar Currículo"}
        </Button>
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {ABAS.map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              aba === a.key ? "bg-white shadow text-[#0f2a5e]" : "text-slate-500 hover:text-slate-700"
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {/* PESSOAL */}
        {aba === "pessoal" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome Completo" value={form.nome || ""} onChange={e => set("nome", e.target.value)} />
            </div>
            <Input label="CPF" value={form.cpf || ""} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            <Input label="RG"  value={form.rg  || ""} onChange={e => set("rg",  e.target.value)} />
            <Input label="Data de Nascimento" type="date" value={form.dataNasc || ""} onChange={e => set("dataNasc", e.target.value)} />
            <Input label="Celular / WhatsApp" value={form.celular || ""} onChange={e => set("celular", e.target.value)} />
            <Input label="E-mail" type="email" value={form.email || ""} readOnly className="bg-slate-50" />
            <Input label="LinkedIn" value={form.linkedin || ""} onChange={e => set("linkedin", e.target.value)} placeholder="linkedin.com/in/..." />
            <div className="col-span-2">
              <Input label="Portfólio / GitHub" value={form.portfolio || ""} onChange={e => set("portfolio", e.target.value)} />
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Endereço</p>
            </div>
            <div className="col-span-2">
              <Input label="Endereço" value={form.endereco || ""} onChange={e => set("endereco", e.target.value)} />
            </div>
            <Input label="Bairro"  value={form.bairro || ""} onChange={e => set("bairro", e.target.value)} />
            <Input label="Cidade"  value={form.cidade || ""} onChange={e => set("cidade", e.target.value)} />
            <Input label="UF"      value={form.uf     || ""} onChange={e => set("uf",     e.target.value)} />
            <Input label="CEP"     value={form.cep    || ""} onChange={e => set("cep",    e.target.value)} />
          </div>
        )}

        {/* FORMAÇÃO */}
        {aba === "formacao" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Curso" value={form.curso || ""} onChange={e => set("curso", e.target.value)} placeholder="Administração de Empresas" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Período</label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={form.periodo || ""}
                onChange={e => set("periodo", e.target.value)}
              >
                <option value="">Selecione...</option>
                {["1","2","3","4","5","6","7","8","9","10"].map(p => (
                  <option key={p} value={p}>{p}º período</option>
                ))}
              </select>
            </div>
            <Input label="Previsão de Conclusão" value={form.previsaoConclusao || ""} onChange={e => set("previsaoConclusao", e.target.value)} placeholder="Julho/2026" />
          </div>
        )}

        {/* EXPERIÊNCIA */}
        {aba === "experiencia" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Objetivo Profissional</label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none"
                value={form.objetivos || ""} onChange={e => set("objetivos", e.target.value)}
                placeholder="Busco oportunidade de estágio na área de..." />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Experiências <span className="text-slate-400 font-normal">(separe cada experiência com uma linha em branco)</span>
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-40 resize-none"
                value={form.experiencias || ""} onChange={e => set("experiencias", e.target.value)}
                placeholder={"2024 — Estágio na Empresa X\nDescrição das atividades...\n\n2023 — Trabalho Voluntário\nDescrição..."} />
            </div>
          </div>
        )}

        {/* HABILIDADES */}
        {aba === "habilidades" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Habilidades <span className="text-slate-400 font-normal">(separadas por vírgula)</span>
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none"
                value={form.habilidades || ""} onChange={e => set("habilidades", e.target.value)}
                placeholder="Excel, Word, PowerPoint, Atendimento ao cliente..." />
              {/* Preview das tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.habilidades || "").split(",").map(h => h.trim()).filter(Boolean).map(h => (
                  <span key={h} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{h}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Idiomas <span className="text-slate-400 font-normal">(separados por vírgula)</span>
              </label>
              <input
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                value={form.idiomas || ""} onChange={e => set("idiomas", e.target.value)}
                placeholder="Inglês básico, Espanhol intermediário..." />
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end mt-4">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "💾 Salvar Currículo"}
        </Button>
      </div>
    </div>
  );
}
