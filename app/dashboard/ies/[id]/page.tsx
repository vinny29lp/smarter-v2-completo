"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const statusCor: Record<string, string> = {
  FIRMADO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDENTE: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
  AGUARDANDO_MINUTA: "bg-purple-100 text-purple-700 border-purple-200",
};
const statusLabel: Record<string, string> = {
  FIRMADO: "✅ Convênio Firmado",
  PENDENTE: "⏳ Aguardando resposta",
  CANCELADO: "❌ Cancelado",
  AGUARDANDO_MINUTA: "📋 Minuta própria em análise",
};

export default function IESDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ies, setIes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    // Busca a lista completa e filtra pelo id
    fetch(`/api/ies?completo=1`)
      .then(r => r.json())
      .then(d => {
        const found = (d.institutions || []).find((i: any) => i.id === id);
        setIes(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const portalUrl = ies?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ies/${ies.token}`
    : "";

  const copiarLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    });
  };

  const reenviarConvite = async () => {
    if (!id || enviando) return;
    setEnviando(true);
    setFeedbackEmail(null);
    try {
      const r = await fetch(`/api/admin/ies-portal/${id}/reenviar-convite`, { method: "POST" });
      const d = await r.json();
      setFeedbackEmail({ ok: !!d.ok, msg: d.ok ? "Convite enviado com sucesso!" : d.error || "Erro ao enviar." });
      if (d.ok) setIes((prev: any) => ({ ...prev, conviteEnviadoEm: new Date().toISOString() }));
    } catch {
      setFeedbackEmail({ ok: false, msg: "Erro ao enviar convite." });
    }
    setEnviando(false);
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Carregando...</div>;
  if (!ies) return (
    <div className="py-20 text-center">
      <p className="text-slate-500">IES não encontrada.</p>
      <Link href="/dashboard/ies" className="text-[#0f2a5e] text-sm font-bold mt-4 inline-block">← Voltar</Link>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/dashboard/ies")} className="text-slate-400 hover:text-slate-600 text-sm">← Portal IES</button>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{ies.name}</h1>
        <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCor[ies.convenioStatus] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
          {statusLabel[ies.convenioStatus] || ies.convenioStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Card: Link do Portal ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
            🔗 Link do Portal de Adesão
          </h2>
          <p className="text-xs text-slate-400 mb-4">Envie este link para o coordenador de estágios da {ies.name}. A IES acessa, lê a apresentação e assina o convênio — tudo online.</p>

          {portalUrl ? (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <p className="text-sm font-mono text-slate-700 break-all flex-1">{portalUrl}</p>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[#0f2a5e] hover:underline text-xs font-bold flex-shrink-0">Abrir ↗</a>
              </div>

              <div className="flex gap-3">
                <button onClick={copiarLink}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition-colors border-2 ${linkCopiado ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {linkCopiado ? "✓ Link copiado!" : "📋 Copiar link"}
                </button>

                <button onClick={reenviarConvite} disabled={enviando || !ies.email}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0f2a5e] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#1e4a8f] transition-colors disabled:opacity-50">
                  {enviando ? "Enviando..." : "✉️ Enviar por e-mail"}
                </button>
              </div>

              {!ies.email && (
                <p className="text-xs text-amber-600 mt-2">⚠️ Nenhum e-mail cadastrado — copie o link e envie manualmente.</p>
              )}

              {feedbackEmail && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-semibold ${feedbackEmail.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {feedbackEmail.msg}
                </div>
              )}

              {ies.conviteEnviadoEm && (
                <p className="text-xs text-slate-400 mt-3">
                  📨 Último envio: {new Date(ies.conviteEnviadoEm).toLocaleString("pt-BR")}
                </p>
              )}
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              ⚠️ Esta IES não possui token de portal. Recrie o cadastro.
            </div>
          )}
        </div>

        {/* ── Card: Dados da IES ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-3">Dados da Instituição</h2>
            <div className="space-y-2 text-sm text-slate-700">
              {ies.razaoSocial && <p><span className="text-xs text-slate-400">Razão Social</span><br/><strong>{ies.razaoSocial}</strong></p>}
              {ies.cnpj && <p><span className="text-xs text-slate-400">CNPJ</span><br/><strong>{ies.cnpj}</strong></p>}
              {ies.tipo && <p><span className="text-xs text-slate-400">Tipo</span><br/><strong>{{ SUPERIOR: "Ensino Superior", TECNICO: "Ensino Técnico", MEDIO: "Ensino Médio", POS_GRADUACAO: "Pós-Graduação" }[ies.tipo as string] || ies.tipo}</strong></p>}
              {ies.cidade && <p><span className="text-xs text-slate-400">Localização</span><br/><strong>{ies.cidade}/{ies.uf}</strong></p>}
              {ies.email && <p><span className="text-xs text-slate-400">E-mail</span><br/><strong>{ies.email}</strong></p>}
              {ies.telefone && <p><span className="text-xs text-slate-400">Telefone</span><br/><strong>{ies.telefone}</strong></p>}
              {ies.coordenador && <p><span className="text-xs text-slate-400">Coordenador</span><br/><strong>{ies.coordenador}</strong>{ies.cargoCoord && <span className="text-slate-400"> — {ies.cargoCoord}</span>}</p>}
            </div>
          </div>

          {ies.convenioStatus === "FIRMADO" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-emerald-600 uppercase mb-3">Convênio Firmado</h2>
              <div className="space-y-1.5 text-sm">
                {ies.assinanteName && <p className="text-slate-700"><span className="text-xs text-slate-400">Assinante</span><br/><strong>{ies.assinanteName}</strong></p>}
                {ies.assinanteEmail && <p className="text-slate-700 text-xs">{ies.assinanteEmail}</p>}
                {ies.convenioAssinadoEm && <p className="text-xs text-slate-400 mt-2">📅 {new Date(ies.convenioAssinadoEm).toLocaleString("pt-BR")}</p>}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700">
            <p className="font-bold mb-1">📌 Sobre o portal</p>
            <p>A IES acessa o link, vê a apresentação completa da Smarter e assina o convênio digitalmente. Após assinar, recebe login e senha por e-mail para acompanhar os estágios dos alunos.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
