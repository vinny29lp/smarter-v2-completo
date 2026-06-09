"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

interface Vaga {
  id: string;
  titulo: string;
  area: string | null;
  modalidade: string | null;
  bolsa: number;
  cargaHoraria: number;
  cidade: string | null;
  uf: string | null;
  publicSlug: string | null;
  company: { name: string };
}

export default function VagasPublicasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [busca, setBusca] = useState({ uf: "", area: "", cidade: "" });

  const fetchVagas = useCallback(async (uf: string, area: string, cidade: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (uf) params.set("uf", uf);
    if (area) params.set("area", area);
    if (cidade) params.set("cidade", cidade);
    try {
      const res = await fetch(`/api/public/vagas?${params}`);
      const data = await res.json();
      setVagas(data.vagas ?? []);
    } catch {
      setVagas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVagas("", "", "");
  }, [fetchVagas]);

  const handleBuscar = () => {
    setBusca({ uf: filtroUF, area: filtroArea, cidade: filtroCidade });
    fetchVagas(filtroUF, filtroArea, filtroCidade);
  };

  const handleLimpar = () => {
    setFiltroUF(""); setFiltroArea(""); setFiltroCidade("");
    setBusca({ uf: "", area: "", cidade: "" });
    fetchVagas("", "", "");
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">

      {/* Header */}
      <header className="bg-[#0f2a5e] shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#f5c400] flex items-center justify-center font-black text-[#0f2a5e] text-sm">S</div>
              <span className="text-white font-bold text-sm">Smarter Estágios</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/cadastro/estudante"
                className="text-white/70 hover:text-white text-xs font-semibold transition-colors"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="bg-[#f5c400] text-[#0f2a5e] px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-300 transition-colors"
              >
                Já tenho cadastro → Entrar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Vagas de Estágio Abertas
          </h1>
          <p className="text-white/70 text-sm mb-6">
            Encontre oportunidades na sua região e candidate-se agora
          </p>

          {/* Filtros */}
          <div className="bg-white rounded-2xl p-4 max-w-3xl mx-auto shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 text-left">ESTADO (UF)</label>
                <select
                  value={filtroUF}
                  onChange={e => setFiltroUF(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                >
                  <option value="">Todos os estados</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 text-left">ÁREA</label>
                <input
                  type="text"
                  value={filtroArea}
                  onChange={e => setFiltroArea(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleBuscar()}
                  placeholder="Ex: Administração, TI..."
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 text-left">CIDADE</label>
                <input
                  type="text"
                  value={filtroCidade}
                  onChange={e => setFiltroCidade(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleBuscar()}
                  placeholder="Ex: São Paulo..."
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBuscar}
                className="flex-1 bg-[#0f2a5e] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors"
              >
                🔍 Buscar Vagas
              </button>
              {(busca.uf || busca.area || busca.cidade) && (
                <button
                  onClick={handleLimpar}
                  className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-slate-400 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Contagem + filtros ativos */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-slate-700">
              {loading ? "Buscando vagas..." : `${vagas.length} vaga${vagas.length !== 1 ? "s" : ""} encontrada${vagas.length !== 1 ? "s" : ""}`}
            </p>
            {(busca.uf || busca.area || busca.cidade) && (
              <p className="text-xs text-slate-400 mt-0.5">
                Filtros: {[busca.uf, busca.area, busca.cidade].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <Link
            href="/login"
            className="text-xs text-[#0f2a5e] font-bold hover:underline"
          >
            Já sou cadastrado → Entrar
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"/>
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4"/>
                <div className="h-3 bg-slate-100 rounded w-full mb-2"/>
                <div className="h-9 bg-slate-100 rounded-xl mt-4"/>
              </div>
            ))}
          </div>
        ) : vagas.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">💼</p>
            <p className="text-slate-600 font-semibold">Nenhuma vaga encontrada</p>
            <p className="text-slate-400 text-sm mt-1">
              Tente ajustar os filtros ou volte em breve — novas vagas são publicadas frequentemente.
            </p>
            {(busca.uf || busca.area || busca.cidade) && (
              <button
                onClick={handleLimpar}
                className="mt-4 text-sm text-[#0f2a5e] font-bold hover:underline"
              >
                Limpar filtros e ver todas as vagas
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vagas.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{v.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{v.company.name}</p>
                    </div>
                    {v.area && (
                      <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                        {v.area}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
                    {v.cidade && v.uf && (
                      <span>📍 {v.cidade}/{v.uf}</span>
                    )}
                    <span>💰 R$ {v.bolsa.toLocaleString("pt-BR")}/mês</span>
                    <span>⏱ {v.cargaHoraria}h/sem</span>
                    {v.modalidade && <span>🏢 {v.modalidade}</span>}
                  </div>
                </div>

                {v.publicSlug ? (
                  <Link
                    href={`/vaga/${v.publicSlug}`}
                    className="block text-center bg-[#0f2a5e] hover:bg-[#1a3d8f] text-white py-2.5 rounded-xl text-sm font-bold transition-colors mt-2"
                  >
                    Ver Vaga e Candidatar-se →
                  </Link>
                ) : (
                  <div className="text-center bg-slate-100 text-slate-400 py-2.5 rounded-xl text-sm mt-2">
                    Vaga sem link público
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA cadastro */}
        <div className="mt-10 bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] rounded-2xl p-6 text-center text-white">
          <p className="font-black text-lg mb-1">Ainda não tem cadastro?</p>
          <p className="text-white/70 text-sm mb-4">
            Crie seu perfil gratuito e candidate-se a todas as vagas disponíveis
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/cadastro/estudante"
              className="bg-[#f5c400] text-[#0f2a5e] px-6 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-300 transition-colors"
            >
              Criar meu perfil grátis
            </Link>
            <Link
              href="/login"
              className="bg-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors border border-white/20"
            >
              Já tenho cadastro → Entrar
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-slate-400">
        Sistema Smarter — Gestão de Estágios
      </footer>
    </div>
  );
}
