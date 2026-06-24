"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function LeadCapturaForm() {
  const params = useSearchParams();
  const ref = params.get("ref") || "";
  const origem = params.get("utm") || params.get("origem") || "link_publico";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [form, setForm] = useState({
    empresa: "", contato: "", cargo: "",
    email: "", telefone: "", cidade: "", setor: "", observacao: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.empresa || !form.telefone) {
      setError("Informe o nome da empresa e telefone."); return;
    }
    setLoading(true); setError("");
    const res = await fetch("/api/public/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, franchiseRef: ref, origem, optIn }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Recebemos seu contato!</h2>
        <p className="text-slate-500 text-sm">Nossa equipe entrará em contato em breve para apresentar as soluções da Smarter Estágios.</p>
        <p className="text-xs text-slate-400 mt-4">Você pode fechar esta página.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#f5c400] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black text-[#0f2a5e]">S</span>
          </div>
          <h1 className="text-2xl font-black text-white">Smarter Estágios</h1>
          <p className="text-white/70 text-sm mt-1">
            Gestão completa de estágios para sua empresa
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-base font-black text-slate-800 mb-1">Quero conhecer a Smarter</h2>
          <p className="text-xs text-slate-400 mb-4">Preencha seus dados e entraremos em contato.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-3">
            <Input
              label="Nome da Empresa *"
              value={form.empresa}
              onChange={e => set("empresa", e.target.value)}
              placeholder="TechCorp Brasil Ltda."
            />
            <Input
              label="Seu Nome"
              value={form.contato}
              onChange={e => set("contato", e.target.value)}
              placeholder="João Silva"
            />
            <Input
              label="Cargo"
              value={form.cargo}
              onChange={e => set("cargo", e.target.value)}
              placeholder="Diretor de RH"
            />
            <Input
              label="WhatsApp *"
              value={form.telefone}
              onChange={e => set("telefone", e.target.value)}
              placeholder="(11) 99999-0000"
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="joao@empresa.com.br"
            />
            <Input
              label="Cidade"
              value={form.cidade}
              onChange={e => set("cidade", e.target.value)}
              placeholder="São Paulo / SP"
            />
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Setor da Empresa</label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={form.setor}
                onChange={e => set("setor", e.target.value)}
              >
                <option value="">Selecione...</option>
                {["Tecnologia","Saúde","Educação","Varejo","Indústria","Financeiro","Logística","Jurídico","Construção Civil","Agronegócio","Marketing","Outro"].map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Como podemos ajudar? (opcional)
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none"
                value={form.observacao}
                onChange={e => set("observacao", e.target.value)}
                placeholder="Tenho X estagiários, preciso de ajuda com documentação..."
              />
            </div>

            <Button
              className="w-full justify-center"
              onClick={handleSubmit}
              disabled={loading || !form.empresa || !form.telefone || !optIn}
            >
              {loading ? "Enviando..." : "Quero conhecer a Smarter →"}
            </Button>

            <div className="flex items-start gap-2 mt-1">
              <input
                id="optin"
                type="checkbox"
                checked={optIn}
                onChange={e => setOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="optin" className="text-[10px] text-slate-500 leading-tight cursor-pointer">
                Concordo em receber comunicações da Smarter Estágios por e-mail e WhatsApp sobre soluções de estágio.
                Seus dados são tratados conforme a <strong>LGPD (Lei 13.709/2018)</strong> e podem ser removidos a qualquer momento.
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
