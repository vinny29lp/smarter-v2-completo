"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NovaIESPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{ies: any; portalUrl: string; emailEnviado: boolean; emailErro?: string} | null>(null);
  const [form, setForm] = useState({
    name: "", razaoSocial: "", cnpj: "", tipo: "SUPERIOR",
    email: "", telefone: "", coordenador: "", cargoCoord: "",
    cidade: "", uf: "", endereco: "", cep: "", site: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Auto-preenchimento via ?iesId=<id> (vindo do detail page da IES) ─────────
  const [prefillNome, setPrefillNome] = useState<string | null>(null);
  useEffect(() => {
    const iesId = searchParams?.get("iesId");
    if (!iesId) return;
    setPrefillLoading(true);
    fetch(`/api/app/instituicoes/${iesId}`)
      .then(r => r.json())
      .then(data => {
        const inst = data.instituicao;
        if (inst) {
          setForm({
            name: inst.name || "",
            razaoSocial: inst.razaoSocial || "",
            cnpj: inst.cnpj || "",
            tipo: inst.tipo || "SUPERIOR",
            email: inst.email || "",
            telefone: inst.telefone || "",
            coordenador: inst.coordenador || "",
            cargoCoord: inst.cargoCoord || "",
            cidade: inst.cidade || "",
            uf: inst.uf || "",
            endereco: inst.endereco || "",
            cep: inst.cep || "",
            site: inst.site || "",
          });
          setPrefillNome(inst.name || null);
          setBusca(inst.name || "");
        }
      })
      .catch(() => {})
      .finally(() => setPrefillLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autocomplete de busca de IES cadastradas ──────────────────────────────
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [iesSelecionada, setIesSelecionada] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const buscarIES = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); setBuscaAberta(false); return; }
    setBuscando(true);
    try {
      const res = await fetch(`/api/app/instituicoes/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data.instituicoes || []);
      setBuscaAberta(true);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusca(val);
    setIesSelecionada(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => buscarIES(val), 300);
  };

  const selecionarIES = async (item: any) => {
    setBusca(item.name);
    setResultados([]);
    setBuscaAberta(false);
    setIesSelecionada(item);
    // Busca dados completos para auto-preencher
    try {
      const res = await fetch(`/api/app/instituicoes/${item.id}`);
      const data = await res.json();
      const inst = data.instituicao;
      if (inst) {
        setForm({
          name: inst.name || "",
          razaoSocial: inst.razaoSocial || "",
          cnpj: inst.cnpj || "",
          tipo: inst.tipo || "SUPERIOR",
          email: inst.email || "",
          telefone: inst.telefone || "",
          coordenador: inst.coordenador || "",
          cargoCoord: inst.cargoCoord || "",
          cidade: inst.cidade || "",
          uf: inst.uf || "",
          endereco: inst.endereco || "",
          cep: inst.cep || "",
          site: inst.site || "",
        });
      }
    } catch {
      // Preenche o que já tem
      setForm(p => ({ ...p, name: item.name, cnpj: item.cnpj || "", cidade: item.cidade || "", uf: item.uf || "" }));
    }
  };

  const limparSelecao = () => {
    setBusca("");
    setIesSelecionada(null);
    setResultados([]);
    setBuscaAberta(false);
    setForm({ name:"", razaoSocial:"", cnpj:"", tipo:"SUPERIOR", email:"", telefone:"", coordenador:"", cargoCoord:"", cidade:"", uf:"", endereco:"", cep:"", site:"" });
  };

  const handleSubmit = async () => {
    setErro("");
    if (!form.name || !form.email) { setErro("Nome da instituição e e-mail são obrigatórios."); return; }
    setLoading(true);
    const res = await fetch("/api/ies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setErro(data.error); return; }
    setSucesso({ ies: data.institution, portalUrl: data.portalUrl, emailEnviado: !!data.emailEnviado, emailErro: data.emailErro });
  };

  if (sucesso) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="text-5xl mb-4 text-center">🎉</div>
          <h2 className="text-xl font-black text-slate-800 text-center mb-1">Convite criado!</h2>
          <p className="text-slate-500 text-sm text-center mb-6">
            O portal de adesão de <strong>{sucesso.ies.name}</strong> está pronto.
          </p>

          {sucesso.emailEnviado ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 mb-4 text-center">
              ✅ E-mail de convite enviado para {sucesso.ies.email}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mb-4">
              ⚠️ E-mail não enviado automaticamente. Envie o link manualmente.
              {sucesso.emailErro && <p className="text-xs mt-1 opacity-80">Motivo: {sucesso.emailErro}</p>}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 mb-2">LINK DO PORTAL IES:</p>
            <p className="text-sm font-mono text-slate-700 break-all">{sucesso.portalUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(sucesso.portalUrl); }}
              className="mt-3 text-xs font-bold text-[#0f2a5e] hover:underline">
              📋 Copiar link
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 mb-6">
            <strong>Instruções para envio manual:</strong><br/>
            Copie o link acima e envie via WhatsApp, e-mail ou qualquer outro canal para o coordenador de estágios da {sucesso.ies.name}. Quando a instituição acessar o link, verá a apresentação completa da Smarter e poderá assinar o convênio.
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard/ies")}
              className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 text-sm">
              Ver lista
            </button>
            <button onClick={() => { setSucesso(null); limparSelecao(); }}
              className="flex-1 bg-[#0f2a5e] text-white font-bold py-3 rounded-xl hover:bg-[#1e4a8f] text-sm">
              + Nova IES
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/ies" className="text-slate-400 hover:text-slate-600 text-sm">← Portal IES</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Novo Convite IES</h1>
      </div>

      {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erro}</div>}

      {prefillLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          Carregando dados da IES...
        </div>
      )}

      {prefillNome && !prefillLoading && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
          ✅ Dados de <strong>{prefillNome}</strong> carregados automaticamente. Revise e ajuste se necessário antes de criar o convite.
        </div>
      )}

      <div className="max-w-2xl space-y-5">

        {/* ── Auto-preenchimento: busca IES já cadastrada ── */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-blue-800 mb-1">🔍 Buscar IES já cadastrada</h3>
          <p className="text-xs text-blue-600 mb-3">Se a instituição já existe no sistema, selecione abaixo para preencher o formulário automaticamente.</p>
          <div ref={wrapperRef} className="relative">
            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={handleBuscaChange}
                onFocus={() => { if (resultados.length > 0) setBuscaAberta(true); }}
                placeholder="Digite o nome ou CNPJ da instituição (mín. 2 caracteres)..."
                className="w-full border-2 border-blue-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white pr-10"
              />
              {busca && (
                <button type="button" onClick={limparSelecao}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none">
                  ×
                </button>
              )}
            </div>
            {buscando && <p className="text-xs text-blue-500 mt-1">Buscando...</p>}
            {buscaAberta && resultados.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border-2 border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {resultados.map((item: any) => (
                  <li key={item.id}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 border-b border-slate-100 last:border-0"
                    onMouseDown={() => selecionarIES(item)}>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    {(item.cidade || item.cnpj) && (
                      <p className="text-xs text-slate-400">{[item.cnpj, item.cidade && `${item.cidade}/${item.uf}`].filter(Boolean).join(" • ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {buscaAberta && resultados.length === 0 && !buscando && busca.length >= 2 && (
              <div className="absolute z-50 w-full bg-white border-2 border-slate-200 rounded-xl shadow-lg mt-1 px-4 py-3 text-sm text-slate-400">
                Nenhuma IES encontrada. Preencha os dados abaixo para criar nova.
              </div>
            )}
          </div>
          {iesSelecionada && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
              <span>✅ Dados de <strong>{iesSelecionada.name}</strong> carregados automaticamente. Revise e ajuste se necessário.</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Dados da Instituição</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Nome da Instituição *</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Universidade Federal de..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Razão Social</label>
              <input type="text" value={form.razaoSocial} onChange={e => set("razaoSocial", e.target.value)}
                placeholder="Fundação..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">CNPJ</label>
              <input type="text" value={form.cnpj} onChange={e => set("cnpj", e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => set("tipo", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white">
                <option value="SUPERIOR">Ensino Superior</option>
                <option value="TECNICO">Ensino Técnico</option>
                <option value="MEDIO">Ensino Médio</option>
                <option value="POS_GRADUACAO">Pós-Graduação</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Site</label>
              <input type="url" value={form.site} onChange={e => set("site", e.target.value)}
                placeholder="https://www.instituicao.edu.br"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Responsável / Coordenador</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Nome do Coordenador</label>
              <input type="text" value={form.coordenador} onChange={e => set("coordenador", e.target.value)}
                placeholder="Prof. João Silva"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Cargo</label>
              <input type="text" value={form.cargoCoord} onChange={e => set("cargoCoord", e.target.value)}
                placeholder="Coordenador de Estágios"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">E-mail do Convite *</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="estagios@instituicao.edu.br"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
              <p className="text-[10px] text-slate-400 mt-1">O link do portal será enviado para este e-mail.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Telefone</label>
              <input type="tel" value={form.telefone} onChange={e => set("telefone", e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Endereço</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Endereço</label>
              <input type="text" value={form.endereco} onChange={e => set("endereco", e.target.value)}
                placeholder="Av. Universitária, 1000"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Cidade</label>
              <input type="text" value={form.cidade} onChange={e => set("cidade", e.target.value)}
                placeholder="São Paulo"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">UF</label>
              <input type="text" value={form.uf} onChange={e => set("uf", e.target.value.toUpperCase())}
                placeholder="SP" maxLength={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          ✉️ Após criar o convite, o sistema envia automaticamente um e-mail para a IES com o link do portal de adesão personalizado.
          Se o envio falhar, você pode copiar o link e enviar manualmente.
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.back()} className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-[#0f2a5e] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1e4a8f] disabled:opacity-50">
            {loading ? "Criando convite..." : "Criar convite e enviar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
