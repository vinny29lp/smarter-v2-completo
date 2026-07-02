"use client";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";

interface Franquia {
  nome: string;
  responsavel: string;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  cidade?: string | null;
  uf?: string | null;
}
interface LeadInfo { empresa?: string; contato?: string; }

// ─── Beacon helper ────────────────────────────────────────────────────────────
function useSmarterTracking(token: string | null) {
  const sent = useRef(new Set<string>());
  const startTs = useRef(Date.now());
  const lastPing = useRef(0);

  const fire = useCallback((tipo: string, extra?: Record<string, unknown>) => {
    if (!token) return;
    const body = JSON.stringify({ tipo, extra });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`/api/public/apresentacao/${token}/evento`, blob);
    } else {
      fetch(`/api/public/apresentacao/${token}/evento`, {
        method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true,
      }).catch(() => {});
    }
  }, [token]);

  const once = useCallback((tipo: string, extra?: Record<string, unknown>) => {
    if (sent.current.has(tipo)) return;
    sent.current.add(tipo);
    fire(tipo, extra);
  }, [fire]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      const now = Date.now();
      const ref = lastPing.current || startTs.current;
      const secs = Math.round((now - ref) / 1000);
      lastPing.current = now;
      fire("ping_tempo", { segundos: secs });
    }, 30_000);
    return () => clearInterval(id);
  }, [token, fire]);

  return { once };
}

// ─── Section observer ─────────────────────────────────────────────────────────
function useSectionObserver(once: (tipo: string) => void) {
  useEffect(() => {
    const map: Record<string, string> = {
      "sec-2": "scroll_25",
      "sec-4": "scroll_50",
      "sec-6": "scroll_75",
      "sec-8": "chegou_ao_fim",
    };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const tipo = map[e.target.id];
        if (tipo) once(tipo);
      });
    }, { threshold: 0.25 });
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [once]);
}

// ─── UI Components ────────────────────────────────────────────────────────────
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block bg-[#F4B400]/20 text-[#F4B400] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
      {children}
    </span>
  );
}

function CTABtn({
  children, onClick, variant = "yellow", className = "",
}: {
  children: ReactNode; onClick?: () => void;
  variant?: "yellow" | "white" | "outline" | "ghost";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer";
  const v = {
    yellow:  "bg-[#F4B400] text-[#0D2B5C] hover:bg-[#f5c400] shadow-lg shadow-[#F4B400]/30",
    white:   "bg-white text-[#0D2B5C] hover:bg-slate-50 shadow-lg",
    outline: "border-2 border-white/40 text-white hover:bg-white/10",
    ghost:   "border border-[#0D2B5C]/20 text-[#0D2B5C] hover:bg-[#0D2B5C]/5",
  };
  return (
    <button onClick={onClick} className={`${base} ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

function AuthorityCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="w-10 h-10 rounded-xl bg-[#0D2B5C]/8 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-black text-slate-800 text-sm">{title}</p>
        {desc && <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>}
      </div>
    </div>
  );
}

function ProcessStep({ n, total, title, desc }: { n: number; total: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#F4B400] text-[#0D2B5C] flex items-center justify-center font-black text-sm shadow-md shadow-[#F4B400]/30">
          {n}
        </div>
        {n < total && <div className="w-0.5 flex-1 bg-gradient-to-b from-[#F4B400]/40 to-transparent mt-1 min-h-6" />}
      </div>
      <div className="pb-7">
        <p className="font-black text-white text-sm">{title}</p>
        <p className="text-white/60 text-xs mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-800 text-sm pr-4">{q}</span>
        <span className={`text-[#0D2B5C] font-black text-xl transition-transform flex-shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <p className="text-slate-600 text-sm leading-relaxed pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ComercialPage() {
  const params  = useParams();
  const token   = (params?.token as string) ?? null;

  const [franquia, setFranquia]         = useState<Franquia | null>(null);
  const [lead, setLead]                 = useState<LeadInfo | null>(null);
  const [faqOpen, setFaqOpen]           = useState<number | null>(null);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [smartCTA, setSmartCTA]         = useState(false); // após 2min ou fim da página

  const { once } = useSmarterTracking(token);
  useSectionObserver(once);

  // Registra abertura + dados da franquia
  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/apresentacao/${token}`)
      .then(r => r.json())
      .then(d => { if (d.ok) { setFranquia(d.franquia); setLead(d.lead); } })
      .catch(() => {});
  }, [token]);

  // Header scroll
  useEffect(() => {
    const fn = () => setHeaderScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Smart CTA: ativa após 2 minutos
  useEffect(() => {
    const t = setTimeout(() => setSmartCTA(true), 120_000);
    return () => clearTimeout(t);
  }, []);

  // Smart CTA: ativa quando chega ao final da página
  useEffect(() => {
    const el = document.getElementById("sec-8");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setSmartCTA(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Helpers de contato
  const wppLink = useCallback((msg?: string) => {
    const num = franquia?.whatsapp?.replace(/\D/g, "") || "";
    if (!num) return null;
    const text = msg ?? "Olá! Vi a apresentação da Smarter Estágios e tenho interesse em conversar.";
    return `https://wa.me/55${num}?text=${encodeURIComponent(text)}`;
  }, [franquia]);

  const handleWpp = useCallback((msg?: string) => {
    once("clicou_whatsapp");
    const url = wppLink(msg);
    if (url) window.open(url, "_blank");
    else document.getElementById("sec-8")?.scrollIntoView({ behavior: "smooth" });
  }, [once, wppLink]);

  const handleAgendar = useCallback(() => {
    once("clicou_agendamento");
    handleWpp("Olá! Gostaria de agendar uma conversa sobre o programa de estágio da Smarter. Qual o melhor horário?");
  }, [once, handleWpp]);

  const handleVaga = useCallback(() => {
    once("clicou_vaga");
    handleWpp("Olá! Tenho interesse em abrir uma vaga de estágio com a Smarter Estágios. Podemos conversar?");
  }, [once, handleWpp]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const franqNome   = franquia?.responsavel || "Equipe Smarter";
  const franqCidade = [franquia?.cidade, franquia?.uf].filter(Boolean).join("/");
  const contatoNome = lead?.contato?.split(" ")[0];
  const contatoEmpresa = lead?.empresa;

  const FAQ = [
    { q: "Minha empresa pode contratar estagiário?",
      a: "Sim. Qualquer empresa — independente do porte — pode contratar estagiários, desde que as atividades sejam relacionadas ao curso do estudante. A Smarter orienta todo o processo conforme a Lei nº 11.788/2008." },
    { q: "Quanto tempo leva para contratar um estagiário?",
      a: "Em média entre 7 e 15 dias úteis após a definição do perfil. A Smarter já conta com uma rede ativa de estudantes e instituições parceiras, o que agiliza bastante o processo." },
    { q: "A contratação gera vínculo empregatício?",
      a: "Não. O estágio não gera vínculo empregatício desde que seja formalizado corretamente pelo Termo de Compromisso de Estágio (TCE). A Smarter garante total conformidade jurídica." },
    { q: "Quem faz o TCE e a documentação?",
      a: "A Smarter. Cuidamos de toda a documentação: TCE, plano de atividades, seguro contra acidentes pessoais e convênio com a instituição de ensino. Sua empresa só assina." },
    { q: "Preciso ter convênio com a faculdade?",
      a: "Não. A Smarter já possui convênio ativo com diversas instituições de ensino. Isso simplifica o processo e elimina uma etapa burocrática para a empresa." },
    { q: "Como funciona o seguro do estagiário?",
      a: "O seguro contra acidentes pessoais é obrigatório por lei e está incluso no processo gerenciado pela Smarter. Você não precisa se preocupar com contratação separada." },
    { q: "Posso contratar estagiário do ensino médio?",
      a: "Sim. A lei permite estágio para estudantes do ensino médio regular, profissional e de educação especial, além de estudantes do ensino superior." },
    { q: "Posso participar da seleção e escolher o estagiário?",
      a: "Sim. A Smarter faz a triagem e encaminha os candidatos mais alinhados ao perfil da vaga. A entrevista final e a escolha são sempre da empresa." },
    { q: "Quem acompanha o estagiário durante o contrato?",
      a: "A Smarter realiza avaliações semestrais de desempenho e oferece suporte contínuo para empresa, estudante e instituição de ensino durante todo o período do estágio." },
    { q: "Como funciona para estágio obrigatório?",
      a: "O estágio obrigatório segue as mesmas regras de formalização, porém sem a necessidade de bolsa-auxílio ou vale-transporte. A Smarter adapta o processo ao tipo de estágio da sua empresa." },
  ];

  return (
    <div className="font-sans antialiased text-slate-800 bg-white overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        headerScrolled ? "bg-[#0D2B5C]/97 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-smarter-white.png" alt="Smarter Estágios" className="h-8 w-auto" />

          <nav className="hidden md:flex items-center gap-6">
            {[["Por que a Smarter", "sec-2"], ["Como funciona", "sec-6"], ["Dúvidas", "sec-7"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-white/80 hover:text-white text-xs font-bold transition-colors">
                {l}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <CTABtn onClick={handleAgendar} variant="yellow" className="hidden sm:inline-flex text-xs px-4 py-2">
              Falar com especialista
            </CTABtn>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2">
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <div className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0D2B5C] border-t border-white/10 px-4 py-3 space-y-2">
            {[["Por que a Smarter", "sec-2"], ["Como funciona", "sec-6"], ["Dúvidas", "sec-7"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left text-white/80 py-2 text-sm font-semibold">
                {l}
              </button>
            ))}
            <CTABtn onClick={handleAgendar} variant="yellow" className="w-full mt-2">Falar com especialista</CTABtn>
          </div>
        )}
      </header>

      {/* ══ SEC 1 — HERO ══════════════════════════════════════════════════════ */}
      <section id="sec-1" className="relative min-h-screen flex items-center bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] overflow-hidden">
        {/* Decoração */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#F4B400]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-80 h-80 bg-[#F4B400]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(244,180,0,0.03),transparent_70%)]" />
          {/* Grid decorativo */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-24 pt-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div>
              {/* Badge personalizado */}
              {contatoNome ? (
                <div className="inline-flex items-center gap-2 bg-[#F4B400]/15 border border-[#F4B400]/30 text-[#F4B400] text-xs font-bold px-4 py-2 rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#F4B400] animate-pulse" />
                  Olá, {contatoNome}{contatoEmpresa ? ` da ${contatoEmpresa}` : ""}. Esta apresentação foi preparada para você.
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-[#F4B400]/15 border border-[#F4B400]/30 text-[#F4B400] text-xs font-bold px-4 py-2 rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#F4B400] animate-pulse" />
                  Apresentação Comercial · Smarter Estágios
                </div>
              )}

              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
                Contratar bons profissionais está cada vez mais{" "}
                <span className="text-[#F4B400]">caro e demorado.</span>
              </h1>

              <p className="text-white/70 text-lg leading-relaxed mb-3">
                {contatoNome
                  ? `Preparamos esta apresentação pensando no perfil da sua empresa, ${contatoNome}. Nos próximos minutos você vai ver como reduzir tempo, burocracia e custos na contratação de talentos.`
                  : "A Smarter Estágios ajuda sua empresa a contratar talentos em formação com processo seguro, ágil e custo muito menor que uma contratação tradicional."}
              </p>

              <p className="text-white/50 text-sm mb-8">
                Gestão completa do estágio — da publicação da vaga ao encerramento.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <CTABtn onClick={handleVaga} variant="yellow" className="text-base px-7 py-4">
                  🎓 Quero contratar estagiários
                </CTABtn>
                <CTABtn onClick={() => handleWpp()} variant="outline" className="text-base px-7 py-4">
                  💬 Falar pelo WhatsApp
                </CTABtn>
              </div>

              <button onClick={handleAgendar}
                className="text-white/50 text-xs font-semibold hover:text-white/80 transition-colors underline underline-offset-2">
                📅 Prefiro agendar uma reunião →
              </button>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/10">
                {["✅ Lei nº 11.788/2008", "✅ Seguro incluso", "✅ Sem vínculo CLT", "✅ Processo 100% digital"].map(t => (
                  <span key={t} className="text-white/50 text-xs font-semibold">{t}</span>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="hidden lg:block relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80"
                  alt="Equipe profissional em reunião de trabalho"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D2B5C]/60 to-transparent" />
                {/* Card flutuante */}
                <div className="absolute bottom-5 left-5 right-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F4B400] flex items-center justify-center text-[#0D2B5C] font-black text-sm">
                      {franqNome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">{franqNome}</p>
                      <p className="text-white/60 text-xs">Smarter Estágios{franqCidade ? ` · ${franqCidade}` : ""}</p>
                    </div>
                    {franquia?.whatsapp && (
                      <a href={wppLink() || "#"} target="_blank" rel="noopener noreferrer"
                        onClick={() => once("clicou_whatsapp")}
                        className="ml-auto bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-400 transition-colors">
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-[#F4B400] text-[#0D2B5C] rounded-2xl px-4 py-3 shadow-xl shadow-[#F4B400]/30">
                <p className="font-black text-lg leading-none">100%</p>
                <p className="text-xs font-bold opacity-80">Conforme a Lei</p>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ SEC 2 — AUTORIDADE ════════════════════════════════════════════════ */}
      <section id="sec-2" className="py-20 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Tag>Por que escolher a Smarter?</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Tudo o que sua empresa precisa,{" "}
              <span className="text-[#0D2B5C]">em um único lugar.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              A Smarter cuida de ponta a ponta para que você foque no que realmente importa: o crescimento do seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "⚖️", title: "Conformidade jurídica", desc: "Processo 100% conforme a Lei nº 11.788/2008. Sem riscos trabalhistas." },
              { icon: "🛡️", title: "Seguro incluso", desc: "Seguro contra acidentes pessoais do estagiário já incluído no processo." },
              { icon: "📋", title: "Gestão completa", desc: "Da publicação da vaga ao encerramento do contrato — a Smarter cuida de tudo." },
              { icon: "🏫", title: "Convênio com IES", desc: "Já possuímos convênio com diversas instituições de ensino. Sem burocracia extra." },
              { icon: "🤝", title: "Atendimento humanizado", desc: "Suporte próximo para empresa, estudante e instituição durante todo o estágio." },
              { icon: "📱", title: "Processo digital", desc: "Documentação, assinaturas e acompanhamento via plataforma digital." },
              { icon: "⚡", title: "Agilidade na contratação", desc: "Triagem rápida dos candidatos e encaminhamento dos perfis mais alinhados." },
              { icon: "📊", title: "Acompanhamento contínuo", desc: "Avaliações semestrais e relatórios de desempenho do estagiário." },
            ].map((c, i) => <AuthorityCard key={i} {...c} />)}
          </div>

          <div className="mt-10 text-center">
            <CTABtn onClick={handleVaga} variant="ghost" className="text-sm">
              Solicitar atendimento →
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 3 — DOR ══════════════════════════════════════════════════════ */}
      <section id="sec-3" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Imagem */}
            <div className="relative rounded-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
                alt="Empresário com desafios de recrutamento"
                className="w-full h-80 lg:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D2B5C]/70 to-transparent flex items-center">
                <div className="p-8">
                  <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-2">Realidade das empresas</p>
                  <p className="text-white font-black text-2xl leading-tight">
                    Recrutar custa tempo e dinheiro.<br />
                    <span className="text-[#F4B400]">E muitas vezes não funciona.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pain points */}
            <div>
              <Tag>O desafio que você conhece</Tag>
              <h2 className="text-3xl font-black text-slate-800 mb-6">
                Sua empresa merece{" "}
                <span className="text-[#0D2B5C]">uma solução mais inteligente.</span>
              </h2>

              <div className="space-y-3">
                {[
                  { icon: "💸", text: "Alto custo com contratações CLT e rescisões trabalhistas" },
                  { icon: "⏱️", text: "Tempo perdido em processos seletivos sem resultado" },
                  { icon: "🔍", text: "Dificuldade de encontrar candidatos comprometidos e alinhados" },
                  { icon: "😓", text: "Equipe sobrecarregada com tarefas operacionais" },
                  { icon: "🔄", text: "Alta rotatividade e constante necessidade de recontratação" },
                  { icon: "📑", text: "Burocracia e insegurança jurídica na contratação" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xl">{p.icon}</span>
                    <p className="text-slate-700 text-sm font-semibold">{p.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[#0D2B5C] rounded-2xl text-white">
                <p className="font-black text-sm mb-1">💡 A Smarter resolve todos esses pontos</p>
                <p className="text-white/70 text-xs">Com menor investimento, processo seguro e gestão completa do início ao fim.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SEC 4 — PROCESSO ══════════════════════════════════════════════════ */}
      <section id="sec-4" className="py-20 bg-[#0D2B5C]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Tag>Processo transparente</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              O que a Smarter faz{" "}
              <span className="text-[#F4B400]">pela sua empresa</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Do primeiro contato ao encerramento — sua empresa praticamente não precisa se preocupar com burocracia.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Steps */}
            <div>
              {[
                { title: "Publicação da vaga", desc: "Você informa o cargo, perfil e horário. A Smarter divulga nos nossos canais e rede de instituições parceiras." },
                { title: "Triagem dos candidatos", desc: "Selecionamos os perfis mais alinhados ao seu negócio e às exigências do cargo." },
                { title: "Encaminhamento dos melhores perfis", desc: "Você recebe os candidatos pré-selecionados e conduz as entrevistas. A decisão final é sempre sua." },
                { title: "Formalização da documentação", desc: "A Smarter elabora o TCE, plano de atividades e toda a documentação exigida pela legislação." },
                { title: "Seguro e regularização", desc: "Inclusão do estagiário no seguro obrigatório e convênio com a instituição de ensino." },
                { title: "Acompanhamento e avaliações", desc: "Avaliações semestrais, suporte contínuo e gestão do encerramento ao final do contrato." },
              ].map((s, i) => (
                <ProcessStep key={i} n={i + 1} total={6} title={s.title} desc={s.desc} />
              ))}
            </div>

            {/* Visual / imagem */}
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80"
                  alt="Profissional satisfeita com processo eficiente"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D2B5C]/80 to-transparent flex items-end p-6">
                  <p className="text-white font-black text-lg">Sua empresa foca no negócio.<br /><span className="text-[#F4B400]">A Smarter cuida do resto.</span></p>
                </div>
              </div>

              {/* Cards resumo */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: "7–15", label: "dias para contratar", sub: "em média, após definição do perfil" },
                  { n: "0", label: "vínculo empregatício", sub: "segurança jurídica garantida" },
                ].map((c, i) => (
                  <div key={i} className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                    <p className="text-[#F4B400] font-black text-2xl">{c.n}</p>
                    <p className="text-white font-black text-xs mt-1">{c.label}</p>
                    <p className="text-white/50 text-xs mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#F4B400]/15 border border-[#F4B400]/30 rounded-2xl p-4">
                <p className="text-[#F4B400] font-black text-sm mb-1">✅ Sem convênio prévio com IES</p>
                <p className="text-white/60 text-xs">A Smarter já tem os convênios necessários com as principais instituições de ensino da região.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <CTABtn onClick={handleVaga} variant="yellow" className="text-base px-8 py-4">
              🎓 Quero abrir uma vaga agora
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 5 — COMPARAÇÃO ════════════════════════════════════════════════ */}
      <section id="sec-5" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <Tag>Comparativo</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Contratar sozinho ou{" "}
              <span className="text-[#0D2B5C]">com a Smarter?</span>
            </h2>
            <p className="text-slate-500 text-lg">Veja a diferença na prática.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Sem Smarter */}
            <div className="rounded-3xl border-2 border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm">✗</div>
                <p className="font-black text-slate-600">Contratando sozinho</p>
              </div>
              <div className="space-y-3">
                {[
                  "Buscar candidatos por conta própria",
                  "Conferir documentação e regularidade",
                  "Elaborar o TCE (Termo de Compromisso)",
                  "Firmar convênio com a faculdade",
                  "Contratar seguro contra acidentes",
                  "Gerenciar avaliações semestrais",
                  "Cuidar do encerramento do contrato",
                  "Acompanhar mudanças na legislação",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-500">
                    <span className="text-red-400 font-black flex-shrink-0 mt-0.5">✗</span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-red-600 text-xs font-bold">⚠️ Alto risco de erros e exposição jurídica</p>
              </div>
            </div>

            {/* Com Smarter */}
            <div className="rounded-3xl border-2 border-[#0D2B5C] p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F4B400] text-[#0D2B5C] text-xs font-black px-4 py-1 rounded-full">
                Recomendado
              </div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-[#0D2B5C] flex items-center justify-center text-white font-black text-sm">✓</div>
                <p className="font-black text-[#0D2B5C]">Com a Smarter Estágios</p>
              </div>
              <div className="space-y-3">
                {[
                  "Divulgação e triagem feita pela Smarter",
                  "Toda documentação elaborada e conferida",
                  "TCE elaborado e assinado digitalmente",
                  "Convênio com IES já incluído",
                  "Seguro incluso no processo",
                  "Avaliações gerenciadas pela Smarter",
                  "Encerramento cuidado pela Smarter",
                  "Equipe especializada sempre atualizada",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="text-green-500 font-black flex-shrink-0 mt-0.5">✓</span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-green-700 text-xs font-bold">✅ Processo seguro, ágil e 100% conforme a lei</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <CTABtn onClick={handleAgendar} variant="yellow" className="text-base px-8 py-4">
              📅 Agendar uma conversa gratuita
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 6 — COMO FUNCIONA / CONEXÃO HUMANA ═══════════════════════════ */}
      <section id="sec-6" className="py-20 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4">
          {/* Fotos de conexão emocional */}
          <div className="text-center mb-12">
            <Tag>Pessoas reais, resultados reais</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Estagiários que{" "}
              <span className="text-[#0D2B5C]">fazem a diferença</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Conectamos empresas como a sua a estudantes motivados, prontos para contribuir com a sua equipe desde o primeiro dia.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {[
              { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80", alt: "Estudante universitário comprometido", span: "" },
              { src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80", alt: "Parceria entre empresas", span: "row-span-2" },
              { src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&q=80", alt: "Reunião de integração de equipe", span: "" },
              { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80", alt: "Jovem profissional em ambiente corporativo", span: "hidden md:block" },
            ].map((img, i) => (
              <div key={i} className={`${img.span} rounded-2xl overflow-hidden`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>

          {/* Diferenciais em cards horizontais */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: "🎯",
                title: "Candidatos alinhados ao seu perfil",
                desc: "Não enviamos qualquer candidato. Fazemos uma triagem cuidadosa para encaminhar apenas os perfis que fazem sentido para a sua empresa e cargo.",
              },
              {
                icon: "👥",
                title: "Suporte para todos os envolvidos",
                desc: "A Smarter cuida do relacionamento com o estagiário, a empresa e a instituição de ensino — para que o estágio seja uma experiência positiva para todos.",
              },
              {
                icon: "🔄",
                title: "Substituição sem burocracia",
                desc: "Se surgir qualquer incompatibilidade durante o estágio, a Smarter auxilia no processo de substituição de forma ágil e sem complicações jurídicas.",
              },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h4 className="font-black text-slate-800 text-sm mb-2">{c.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <CTABtn onClick={handleVaga} variant="ghost" className="text-sm">
              Receber uma proposta personalizada →
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 7 — FAQ ══════════════════════════════════════════════════════ */}
      <section id="sec-7" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <Tag>Tire suas dúvidas</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Perguntas <span className="text-[#0D2B5C]">frequentes</span>
            </h2>
            <p className="text-slate-500">Respostas rápidas sobre o programa de estágio com a Smarter.</p>
          </div>

          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
            ))}
          </div>

          <div className="mt-8 p-5 bg-[#F5F7FA] rounded-2xl border border-slate-200 text-center">
            <p className="text-slate-700 font-bold text-sm mb-1">Sua dúvida não está aqui?</p>
            <p className="text-slate-500 text-xs mb-3">Fale diretamente com nosso especialista — respondemos em minutos.</p>
            <CTABtn onClick={() => handleWpp("Olá! Tenho algumas dúvidas sobre o programa de estágio da Smarter. Pode me ajudar?")} variant="ghost" className="text-xs">
              💬 Falar com um especialista →
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 8 — CTA FINAL (FORTE) ═════════════════════════════════════════ */}
      <section id="sec-8" className="py-24 bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#F4B400]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F4B400]/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* Imagem impactante */}
          <div className="flex justify-center mb-8">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[#F4B400] shadow-xl shadow-[#F4B400]/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
                alt="Especialista Smarter"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Fechamento persuasivo */}
          <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4">
            {franqNome}{franqCidade ? ` · ${franqCidade}` : ""}
          </p>

          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
            Sua empresa pode continuar perdendo tempo com processos de recrutamento…
          </h2>

          <p className="text-white/70 text-lg md:text-xl mb-3 max-w-2xl mx-auto">
            ou pode contar com a Smarter para cuidar de tudo enquanto você foca no crescimento do seu negócio.
          </p>

          <p className="text-[#F4B400] font-black text-sm mb-10">
            Processo simples, seguro e com custo menor que uma contratação tradicional.
          </p>

          {/* Smart CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <CTABtn onClick={handleVaga} variant="yellow" className="w-full sm:w-auto text-base px-8 py-4">
              {smartCTA ? "🚀 Solicitar consultoria gratuita" : "🎓 Quero falar com um especialista"}
            </CTABtn>
            <CTABtn onClick={() => handleWpp()} variant="white" className="w-full sm:w-auto text-base px-8 py-4">
              💬 Falar pelo WhatsApp agora
            </CTABtn>
          </div>

          <button onClick={handleAgendar}
            className="text-white/40 text-xs font-semibold hover:text-white/70 transition-colors underline underline-offset-2">
            📅 Prefiro agendar uma reunião →
          </button>

          {/* Dados da unidade */}
          {franquia && (
            <div className="mt-14 pt-10 border-t border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-bold">Sua unidade Smarter</p>
              <p className="text-white font-black text-lg">{franquia.responsavel}</p>
              <p className="text-white/60 text-sm mb-4">Smarter Estágios{franqCidade ? ` — ${franqCidade}` : ""}</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {franquia.whatsapp && (
                  <a href={wppLink() || "#"} target="_blank" rel="noopener noreferrer"
                    onClick={() => once("clicou_whatsapp")}
                    className="text-[#F4B400] text-sm font-bold hover:underline">
                    📱 {franquia.whatsapp}
                  </a>
                )}
                {franquia.email && (
                  <a href={`mailto:${franquia.email}`}
                    className="text-white/50 text-sm hover:text-white transition-colors">
                    ✉️ {franquia.email}
                  </a>
                )}
                {franquia.instagram && (
                  <a href={`https://instagram.com/${franquia.instagram.replace(/^@/, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-white transition-colors">
                    📸 {franquia.instagram}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#080f1f] py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-smarter-white.png" alt="Smarter Estágios" className="h-9 w-auto" />
              <p className="text-white/30 text-xs">Agente de Integração · Lei nº 11.788/2008</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/30">
              <span>contato@smarterestagios.com.br</span>
              <button onClick={handleVaga} className="hover:text-white/60 transition-colors">Abrir uma vaga</button>
              <button onClick={handleAgendar} className="hover:text-white/60 transition-colors">Agendar conversa</button>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} Smarter Estágios. Todos os direitos reservados.
              Esta apresentação foi preparada exclusivamente para você.
            </p>
          </div>
        </div>
      </footer>

      {/* ── BOTÃO FLUTUANTE WHATSAPP ── */}
      <div className="fixed bottom-6 right-4 z-40 md:hidden">
        <button
          onClick={() => handleWpp()}
          className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
