"use client";
import { useState } from "react";
import { Target, FileCheck2, Scale, GraduationCap, ShieldCheck, Clock, ClipboardCheck, CheckCircle2 } from "lucide-react";

interface Props {
  empresa: {
    id: string;
    name: string;
    responsavel: string | null;
    valorGestao: number;
    proposalStatus: string;
    proposalSentAt: string | null;
  };
  unidade: {
    name: string;
    cidade: string | null;
    uf: string | null;
    responsavel: string | null;
    whatsapp: string | null;
  };
  token: string;
}

const BENEFICIOS = [
  { icon: Target, title: "Triagem inteligente", desc: "Só chegam até vocês candidatos alinhados à vaga, por perfil comportamental (DISC)." },
  { icon: FileCheck2, title: "Documentação sem burocracia", desc: "TCE gerado e assinado digitalmente, do início ao fim." },
  { icon: Scale, title: "Conformidade total", desc: "100% alinhado à Lei nº 11.788/2008 — zero risco de vínculo empregatício." },
  { icon: GraduationCap, title: "Convênio com IES", desc: "Convênio com instituições de ensino já integrado à plataforma." },
  { icon: ShieldCheck, title: "Seguro incluso", desc: "Seguro contra acidentes pessoais incluso, sem custo extra." },
  { icon: Clock, title: "Agilidade real", desc: "Prazo médio de 7 a 15 dias úteis entre abrir a vaga e o estagiário começar." },
  { icon: ClipboardCheck, title: "Acompanhamento contínuo", desc: "Acompanhamento semestral do estágio, garantindo conformidade durante toda a vigência." },
];

const STEPS = ["Vaga aberta", "Triagem e entrevista", "Documentação", "Estagiário começa"];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function PropostaView({ empresa, unidade, token }: Props) {
  const [status, setStatus] = useState(empresa.proposalStatus);
  const [aceitando, setAceitando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aceitar = async () => {
    setAceitando(true); setErro(null);
    try {
      const res = await fetch(`/api/public/proposta/${token}/aceitar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) { setErro(data.error || "Não foi possível registrar o aceite. Tente novamente."); }
      else { setStatus("ACEITA"); }
    } catch {
      setErro("Não foi possível registrar o aceite agora. Tente novamente em instantes.");
    }
    setAceitando(false);
  };

  const cidade = [unidade.cidade, unidade.uf].filter(Boolean).join("/");
  const dataProposta = empresa.proposalSentAt ? new Date(empresa.proposalSentAt) : new Date();
  const validade = new Date(dataProposta);
  validade.setDate(validade.getDate() + 15);
  const primeiroNome = empresa.responsavel?.split(" ")[0];
  const valorStr = empresa.valorGestao.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const wppNum = unidade.whatsapp?.replace(/\D/g, "");
  const wppLink = wppNum
    ? `https://wa.me/55${wppNum}?text=${encodeURIComponent(`Olá! Recebi a proposta comercial da Smarter para a ${empresa.name} e gostaria de conversar.`)}`
    : null;

  const aceita = status === "ACEITA";

  return (
    <div className="font-sans antialiased text-slate-800 bg-white">
      {/* ══ HERO ══ */}
      <section className="bg-[#0D2B5C] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-smarter-white.png" alt="Smarter Estágios" className="h-7 w-auto" />
            <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {unidade.name}{cidade ? ` · ${cidade}` : ""}
            </span>
          </div>

          <p className="text-[#F4B400] text-xs font-black uppercase tracking-widest mb-3">Proposta Comercial</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">
            Proposta para {empresa.name}
          </h1>
          <p className="text-white/70 text-base leading-relaxed mb-6 max-w-2xl">
            {primeiroNome ? `Olá, ${primeiroNome}. ` : "Olá. "}
            Com base no que vimos sobre a {empresa.name}, preparamos uma proposta objetiva para vocês
            começarem a contratar estagiários com a Smarter.
          </p>

          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-bold px-4 py-2 rounded-full">
            Válida até {validade.toLocaleDateString("pt-BR")}
          </span>
        </div>
      </section>

      {/* ══ O QUE ESTÁ INCLUSO ══ */}
      <section className="bg-white py-14">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-black text-slate-800 mb-6">O que está incluso</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFICIOS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#0D2B5C]/8 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#0D2B5C]" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{b.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper */}
          <div className="mt-12 flex items-start justify-between max-w-2xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center text-center relative">
                {i < STEPS.length - 1 && (
                  <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i === STEPS.length - 2 ? "bg-gradient-to-r from-slate-200 to-[#F4B400]" : "bg-slate-200"}`} />
                )}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                  i === STEPS.length - 1 ? "bg-[#F4B400] text-[#0D2B5C]" : "bg-[#0D2B5C] text-white"
                }`}>
                  {i + 1}
                </div>
                <p className={`text-[11px] font-bold mt-2 px-1 ${i === STEPS.length - 1 ? "text-[#b8860b]" : "text-slate-500"}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INVESTIMENTO ══ */}
      <section className="bg-[#F7F8FA] py-14">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-t-[3px] border-[#F4B400]">
            <div className="p-7 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Investimento</p>
              <p className="text-4xl font-black text-[#0D2B5C]">
                R$ {valorStr}<span className="text-base font-bold text-slate-400">/mês</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">por estagiário ativo — sem taxas escondidas</p>

              <div className="mt-6 space-y-2 text-left">
                {[
                  "Gestão completa do estágio inclusa",
                  "Contrato de 12 meses, renovável automaticamente",
                  "Cancelamento com 30 dias de aviso, sem multa",
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="bg-[#0D2B5C] py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          {aceita ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <CheckCircle2 className="w-10 h-10 text-[#F4B400] mx-auto mb-2" />
              <p className="text-white font-black">Proposta aceita!</p>
              <p className="text-white/60 text-sm mt-1">
                Nossa equipe vai entrar em contato para os próximos passos.
              </p>
            </div>
          ) : (
            <>
              {erro && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-sm text-red-200">{erro}</div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={aceitar}
                  disabled={aceitando}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm bg-[#F4B400] text-[#0D2B5C] hover:bg-[#f5c400] shadow-lg shadow-[#F4B400]/30 transition-all active:scale-95 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {aceitando ? "Enviando..." : "Aceitar proposta"}
                </button>
                {wppLink && (
                  <a
                    href={wppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm border-2 border-white/40 text-white hover:bg-white/10 transition-all active:scale-95"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Falar com {unidade.responsavel || "a unidade"} no WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-white py-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-xs">
            {unidade.name} — Agente de Integração · Lei nº 11.788/2008
          </p>
        </div>
      </footer>
    </div>
  );
}
