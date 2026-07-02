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

  // Ping de tempo a cada 30s
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

// ─── Small reusable pieces ─────────────────────────────────────────────────────
function SectionTag({ children }: { children: string }) {
  return (
    <span className="inline-block bg-[#F4B400]/20 text-[#F4B400] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
      {children}
    </span>
  );
}

function PainCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <p className="text-slate-700 text-sm font-semibold leading-snug mt-0.5">{text}</p>
    </div>
  );
}

function ServiceCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/20 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="text-white font-black text-sm mb-1">{title}</h4>
      <p className="text-white/70 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function BenefitCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-xl bg-[#F4B400] text-[#0D2B5C] flex items-center justify-center font-black text-sm mb-3">
        {num}
      </div>
      <h4 className="font-black text-slate-800 text-sm mb-1">{title}</h4>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-[#0D2B5C] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
          {n}
        </div>
        {n < 6 && <div className="w-0.5 flex-1 bg-[#0D2B5C]/20 mt-2" />}
      </div>
      <div className="pb-6">
        <h4 className="font-black text-slate-800 text-sm">{title}</h4>
        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FaqItem({
  q, a, open, onToggle,
}: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-800 text-sm pr-4">{q}</span>
        <span className={`text-[#0D2B5C] font-black text-lg transition-transform flex-shrink-0 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-slate-600 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── CTA Button ──────────────────────────────────────────────────────────────
function CTABtn({
  children, onClick, variant = "yellow", className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "yellow" | "white" | "outline";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95";
  const variants = {
    yellow:  "bg-[#F4B400] text-[#0D2B5C] hover:bg-[#f5c400] shadow-lg shadow-[#F4B400]/30",
    white:   "bg-white text-[#0D2B5C] hover:bg-slate-50 shadow-lg",
    outline: "border-2 border-white/40 text-white hover:bg-white/10",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ApresentacaoComercialPage() {
  const params = useParams();
  const token = (params?.token as string) ?? null;

  const [franquia, setFranquia] = useState<Franquia | null>(null);
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const { once } = useSmarterTracking(token);
  useSectionObserver(once);

  // Registra abertura + busca dados da franquia
  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/apresentacao/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setFranquia(d.franquia); setLead(d.lead); }
      })
      .catch(() => {});
  }, [token]);

  // Header com sombra ao rolar
  useEffect(() => {
    const fn = () => setHeaderScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
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
    else {
      // Sem número cadastrado — scroll para o CTA final
      document.getElementById("sec-8")?.scrollIntoView({ behavior: "smooth" });
    }
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

  const FAQ = [
    { q: "Minha empresa pode contratar estagiário?",
      a: "Sim, desde que as atividades estejam alinhadas ao curso do estudante e sejam respeitadas as regras da Lei do Estágio (Lei nº 11.788/2008). A Smarter orienta todo o processo." },
    { q: "A contratação gera vínculo empregatício?",
      a: "Não. O estágio não gera vínculo desde que seja formalizado corretamente por meio do Termo de Compromisso de Estágio (TCE) e siga os requisitos legais. A Smarter garante essa conformidade." },
    { q: "A Smarter cuida de toda a documentação?",
      a: "Sim. Auxiliamos na formalização do TCE, seguro contra acidentes pessoais, plano de atividades e no acompanhamento semestral do estagiário." },
    { q: "Posso participar da seleção dos candidatos?",
      a: "Sim. Você recebe os perfis encaminhados pela Smarter e participa da entrevista final. A decisão é sempre da empresa." },
    { q: "O processo é seguro juridicamente?",
      a: "Sim. A Smarter trabalha com processos estruturados para dar segurança à empresa, ao estudante e à instituição de ensino, seguindo a Lei nº 11.788/2008." },
    { q: "Qual o custo para contratar com a Smarter?",
      a: "O investimento varia conforme o serviço contratado. Entre em contato para receber uma proposta personalizada para sua empresa." },
  ];

  return (
    <div className="font-sans antialiased text-slate-800 bg-white overflow-x-hidden">

      {/* ── HEADER FIXO ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        headerScrolled ? "bg-[#0D2B5C]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F4B400] flex items-center justify-center">
              <span className="text-[#0D2B5C] font-black text-sm">S</span>
            </div>
            <span className="text-white font-black text-sm tracking-tight hidden sm:block">
              Smarter Estágios
            </span>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {[["Benefícios", "sec-5"], ["Como funciona", "sec-6"], ["FAQ", "sec-7"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-white/80 hover:text-white text-xs font-bold transition-colors">
                {l}
              </button>
            ))}
          </nav>

          {/* CTA header */}
          <div className="flex items-center gap-2">
            <CTABtn onClick={handleAgendar} variant="yellow" className="hidden sm:inline-flex text-xs px-4 py-2.5">
              Falar com a Smarter
            </CTABtn>
            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white p-2">
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <div className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-[#0D2B5C] border-t border-white/10 px-4 py-3 space-y-2">
            {[["Benefícios", "sec-5"], ["Como funciona", "sec-6"], ["Dúvidas", "sec-7"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left text-white/80 py-2 text-sm font-semibold">
                {l}
              </button>
            ))}
            <CTABtn onClick={handleAgendar} variant="yellow" className="w-full mt-2">
              Falar com a Smarter
            </CTABtn>
          </div>
        )}
      </header>

      {/* ── SEÇÃO 1: HERO ── */}
      <section id="sec-1" className="relative min-h-screen flex items-center bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#F4B400]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-80 h-80 bg-[#F4B400]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(244,180,0,0.04),transparent_70%)]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-24 pt-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F4B400]/15 border border-[#F4B400]/30 text-[#F4B400] text-xs font-bold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F4B400] animate-pulse" />
            {contatoNome
              ? `Olá, ${contatoNome}! Essa apresentação é para você.`
              : "Apresentação Comercial · Smarter Estágios"}
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-6 max-w-4xl mx-auto">
            Sua empresa está pronta para{" "}
            <span className="text-[#F4B400]">formar os próximos talentos?</span>
          </h1>

          <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            A Smarter Estágios ajuda empresas a contratar estagiários de forma{" "}
            <strong className="text-white">simples, segura e estratégica</strong>, conectando
            sua equipe aos estudantes mais alinhados ao seu negócio.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTABtn onClick={handleVaga} variant="yellow" className="w-full sm:w-auto text-base px-8 py-4">
              🎓 Quero contratar estagiários
            </CTABtn>
            <CTABtn onClick={handleWpp} variant="outline" className="w-full sm:w-auto text-base px-8 py-4">
              💬 Falar com a Smarter
            </CTABtn>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            {[
              "✅ Lei nº 11.788/2008",
              "✅ Seguro incluso",
              "✅ Gestão completa",
              "✅ Sem vínculo empregatício",
            ].map(t => (
              <span key={t} className="text-white/60 text-xs font-semibold">{t}</span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
              <div className="w-1 h-2 bg-white/50 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 2: DOR ── */}
      <section id="sec-2" className="py-20 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>O desafio das empresas</SectionTag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Contratar bons talentos está cada{" "}
              <span className="text-[#0D2B5C]">vez mais difícil.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Empresas de todos os tamanhos enfrentam desafios para encontrar profissionais
              comprometidos, reduzir custos e formar pessoas alinhadas à sua cultura.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "💸", text: "Alto custo para contratar e manter colaboradores CLT" },
              { icon: "⏱️", text: "Falta de tempo para recrutar e selecionar candidatos" },
              { icon: "🔍", text: "Dificuldade em encontrar candidatos comprometidos e alinhados" },
              { icon: "😓", text: "Equipe sobrecarregada com tarefas operacionais repetitivas" },
              { icon: "🔄", text: "Alta rotatividade e custos com rescisões trabalhistas" },
              { icon: "📉", text: "Pouca previsibilidade no crescimento da equipe" },
            ].map((c, i) => <PainCard key={i} {...c} />)}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 3: MUDANÇA DE VISÃO ── */}
      <section id="sec-3" className="py-20 bg-gradient-to-br from-[#F4B400] to-[#e8a800]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-6xl mb-6">💡</div>
          <h2 className="text-3xl md:text-4xl font-black text-[#0D2B5C] mb-6 leading-tight">
            Empresas inteligentes não esperam talentos prontos.{" "}
            <span className="underline decoration-[#0D2B5C]/30">Elas formam talentos.</span>
          </h2>
          <p className="text-[#0D2B5C]/80 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
            O estágio é uma das formas mais estratégicas de desenvolver profissionais dentro da
            cultura da empresa — com <strong>menor custo</strong>, segurança jurídica e
            acompanhamento adequado da Smarter em cada etapa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-[#0D2B5C] text-white rounded-2xl px-6 py-4 text-center">
              <p className="text-2xl font-black">70%</p>
              <p className="text-xs opacity-70">menor custo vs. contratação CLT</p>
            </div>
            <div className="bg-[#0D2B5C] text-white rounded-2xl px-6 py-4 text-center">
              <p className="text-2xl font-black">100%</p>
              <p className="text-xs opacity-70">conformidade com a Lei do Estágio</p>
            </div>
            <div className="bg-[#0D2B5C] text-white rounded-2xl px-6 py-4 text-center">
              <p className="text-2xl font-black">+5 mil</p>
              <p className="text-xs opacity-70">estagiários conectados pela Smarter</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 4: SOLUÇÃO ── */}
      <section id="sec-4" className="py-20 bg-[#0D2B5C]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>Nossa solução</SectionTag>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              A Smarter cuida do processo para{" "}
              <span className="text-[#F4B400]">sua empresa focar no crescimento.</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Do recrutamento à formalização — a Smarter gerencia cada etapa com agilidade e segurança.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "📢", title: "Divulgação da vaga", desc: "Publicamos sua vaga em nossas plataformas e redes de instituições parceiras." },
              { icon: "👥", title: "Encaminhamento de candidatos", desc: "Selecionamos os perfis mais alinhados à sua empresa e ao cargo." },
              { icon: "📄", title: "TCE e documentação", desc: "Formalizamos o Termo de Compromisso de Estágio e toda a documentação exigida." },
              { icon: "🛡️", title: "Seguro e acompanhamento", desc: "Inclusão no seguro contra acidentes pessoais e acompanhamento do estágio." },
            ].map((c, i) => <ServiceCard key={i} {...c} />)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { icon: "🏫", title: "Relação com a IES", desc: "Gerenciamos o convênio com a instituição de ensino do estudante." },
              { icon: "📊", title: "Avaliações semestrais", desc: "Acompanhamento da performance e relatórios de desempenho do estagiário." },
              { icon: "🤝", title: "Suporte completo", desc: "Apoio contínuo para empresa, estudante e instituição durante todo o contrato." },
            ].map((c, i) => <ServiceCard key={i} {...c} />)}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 5: BENEFÍCIOS ── */}
      <section id="sec-5" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>Por que a Smarter?</SectionTag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Por que contratar estagiários{" "}
              <span className="text-[#0D2B5C]">com a Smarter?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { num: "01", title: "Redução de custos", desc: "Contrate talentos em formação com investimento significativamente menor que uma contratação tradicional." },
              { num: "02", title: "Formação interna", desc: "Desenvolva profissionais alinhados à sua cultura e aos processos da empresa desde o início." },
              { num: "03", title: "Segurança jurídica", desc: "Processo estruturado conforme a Lei nº 11.788/2008, sem riscos trabalhistas." },
              { num: "04", title: "Agilidade no processo", desc: "Apoio na divulgação da vaga, triagem e encaminhamento de candidatos qualificados." },
              { num: "05", title: "Atendimento humanizado", desc: "Suporte próximo e personalizado durante toda a jornada — empresa, estudante e IES." },
              { num: "06", title: "Gestão completa", desc: "A Smarter acompanha desde a abertura da vaga até a formalização e o encerramento do estágio." },
            ].map((b, i) => <BenefitCard key={i} {...b} />)}
          </div>

          <div className="mt-10 text-center">
            <CTABtn onClick={handleVaga} variant="yellow" className="text-base px-8 py-4">
              🎓 Quero abrir uma vaga agora
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 6: COMO FUNCIONA ── */}
      <section id="sec-6" className="py-20 bg-[#F5F7FA]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>Processo simples</SectionTag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Como funciona na <span className="text-[#0D2B5C]">prática</span>
            </h2>
            <p className="text-slate-500 text-lg">
              Da abertura da vaga à chegada do estagiário — tudo com suporte da Smarter.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            {[
              { title: "Sua empresa informa a vaga",
                desc: "Você nos conta o cargo, atividades, horário e perfil desejado. Leva menos de 10 minutos." },
              { title: "A Smarter divulga e identifica candidatos",
                desc: "Publicamos em nossas redes e buscamos estudantes alinhados ao seu perfil nas instituições parceiras." },
              { title: "Você entrevista os melhores perfis",
                desc: "Recebe os candidatos pré-selecionados e conduz as entrevistas. A decisão final é sempre sua." },
              { title: "Documentação formalizada pela Smarter",
                desc: "Cuidamos do TCE, seguro, plano de atividades e todos os documentos necessários." },
              { title: "O estagiário inicia as atividades",
                desc: "Com tudo regularizado, o estudante começa a contribuir com a sua equipe." },
              { title: "A Smarter acompanha o processo",
                desc: "Fazemos avaliações semestrais e estamos disponíveis para suporte contínuo a todos os envolvidos." },
            ].map((s, i) => <StepItem key={i} n={i + 1} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 7: FAQ ── */}
      <section id="sec-7" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>Tire suas dúvidas</SectionTag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Dúvidas <span className="text-[#0D2B5C]">frequentes</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <FaqItem
                key={i}
                q={f.q}
                a={f.a}
                open={faqOpen === i}
                onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 8: CTA FINAL ── */}
      <section id="sec-8" className="py-24 bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#F4B400]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F4B400]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
            Sua próxima contratação pode{" "}
            <span className="text-[#F4B400]">começar por um estágio.</span>
          </h2>
          <p className="text-white/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Fale com a Smarter e descubra como sua empresa pode abrir uma vaga de estágio de forma
            simples, segura e estratégica.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTABtn onClick={handleVaga} variant="yellow" className="w-full sm:w-auto text-base px-8 py-4">
              🎓 Quero abrir uma vaga
            </CTABtn>
            <CTABtn onClick={handleWpp} variant="white" className="w-full sm:w-auto text-base px-8 py-4">
              💬 Falar pelo WhatsApp
            </CTABtn>
            <CTABtn onClick={handleAgendar} variant="outline" className="w-full sm:w-auto text-base px-8 py-4">
              📅 Agendar conversa
            </CTABtn>
          </div>

          {/* Dados da unidade */}
          {franquia && (
            <div className="mt-14 pt-10 border-t border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-bold">
                Sua unidade Smarter
              </p>
              <p className="text-white font-black text-lg">{franquia.responsavel}</p>
              <p className="text-white/60 text-sm">Smarter Estágios{franqCidade ? ` — ${franqCidade}` : ""}</p>
              <div className="flex items-center justify-center gap-6 mt-4">
                {(franquia.whatsapp || franquia.email) && (
                  <>
                    {franquia.whatsapp && (
                      <a href={wppLink() || "#"} target="_blank" rel="noopener noreferrer"
                        className="text-[#F4B400] text-sm font-bold hover:underline flex items-center gap-1">
                        📱 {franquia.whatsapp}
                      </a>
                    )}
                    {franquia.email && (
                      <a href={`mailto:${franquia.email}`}
                        className="text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1">
                        ✉️ {franquia.email}
                      </a>
                    )}
                    {franquia.instagram && (
                      <a href={`https://instagram.com/${franquia.instagram.replace(/^@/, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1">
                        📸 {franquia.instagram}
                      </a>
                    )}
                  </>
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
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4B400] flex items-center justify-center">
                <span className="text-[#0D2B5C] font-black">S</span>
              </div>
              <div>
                <p className="text-white font-black text-sm">Smarter Estágios</p>
                <p className="text-white/40 text-xs">Agente de Integração · Lei nº 11.788/2008</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
              <span>contato@smarterestagios.com.br</span>
              <span>·</span>
              <button onClick={handleVaga} className="hover:text-white/70 transition-colors">
                Abrir uma vaga
              </button>
              <span>·</span>
              <button onClick={handleAgendar} className="hover:text-white/70 transition-colors">
                Agendar conversa
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} Smarter Estágios. Todos os direitos reservados.
              Esta apresentação foi enviada exclusivamente para você.
            </p>
          </div>
        </div>
      </footer>

      {/* ── BOTÃO FLUTUANTE WHATSAPP (MOBILE) ── */}
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
