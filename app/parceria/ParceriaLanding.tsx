"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import type { UnidadePublica } from "./page";

// ─── UI helpers (mesma identidade visual da apresentação /comercial) ──────────
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block bg-[#F4B400]/20 text-[#b8860b] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
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

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
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

// ─── Formulário de captação → cria lead no CRM da unidade ────────────────────
function FormCaptacao({ unidade }: { unidade: UnidadePublica | null }) {
  const [form, setForm] = useState({ contato: "", empresa: "", email: "", telefone: "" });
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.contato || !form.telefone) {
      setError("Informe seu nome e WhatsApp para continuar."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: form.empresa || form.contato,
          contato: form.contato,
          email: form.email,
          telefone: form.telefone,
          franchiseRef: unidade?.id || "",
          origem: "apresentacao_empresas",
          optIn,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setDone(true);
    } catch {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-black text-slate-800 mb-2">Recebemos seus dados!</h3>
        <p className="text-slate-500 text-sm leading-relaxed">
          {unidade
            ? <>A equipe da <strong>{unidade.name}</strong> vai entrar em contato em breve para montar uma proposta sob medida para sua empresa.</>
            : <>Nossa equipe vai entrar em contato em breve para montar uma proposta sob medida para sua empresa.</>}
        </p>
        <p className="text-xs text-slate-400 mt-4">Enquanto isso, pode fechar esta página. 😉</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
      <p className="text-[#0D2B5C] font-black text-lg mb-1">Receba uma proposta gratuita</p>
      <p className="text-slate-400 text-xs mb-5">
        Preencha em 30 segundos. Sem compromisso — um especialista entra em contato com você.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Seu nome *</label>
          <input
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0D2B5C]"
            value={form.contato} onChange={e => set("contato", e.target.value)}
            placeholder="Maria Silva"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Empresa</label>
          <input
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0D2B5C]"
            value={form.empresa} onChange={e => set("empresa", e.target.value)}
            placeholder="Nome da sua empresa"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">WhatsApp *</label>
          <input
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0D2B5C]"
            value={form.telefone} onChange={e => set("telefone", e.target.value)}
            placeholder="(11) 99999-0000"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">E-mail</label>
          <input
            type="email"
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0D2B5C]"
            value={form.email} onChange={e => set("email", e.target.value)}
            placeholder="maria@empresa.com.br"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !form.contato || !form.telefone || !optIn}
          className="w-full bg-[#F4B400] text-[#0D2B5C] font-black text-sm py-4 rounded-2xl hover:bg-[#f5c400] transition-all active:scale-[0.98] shadow-lg shadow-[#F4B400]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Enviando..." : "🚀 Quero contratar estagiários"}
        </button>

        <div className="flex items-start gap-2 mt-1">
          <input
            id="optin-parceria" type="checkbox" checked={optIn}
            onChange={e => setOptIn(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 cursor-pointer flex-shrink-0"
          />
          <label htmlFor="optin-parceria" className="text-[10px] text-slate-500 leading-tight cursor-pointer">
            Concordo em receber contato da Smarter Estágios por e-mail e WhatsApp sobre soluções de estágio.
            Seus dados são tratados conforme a <strong>LGPD (Lei 13.709/2018)</strong> e podem ser removidos a qualquer momento.
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function ParceriaLanding({ unidade }: { unidade: UnidadePublica | null }) {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setHeaderScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const wppLink = useCallback((msg?: string) => {
    const num = unidade?.whatsapp?.replace(/\D/g, "") || "";
    if (!num) return null;
    const text = msg ?? "Olá! Vi a apresentação da Smarter Estágios e quero saber mais sobre contratar estagiários.";
    return `https://wa.me/55${num}?text=${encodeURIComponent(text)}`;
  }, [unidade]);

  const handleWpp = useCallback((msg?: string) => {
    const url = wppLink(msg);
    if (url) window.open(url, "_blank");
    else scrollTo("sec-form");
  }, [wppLink]);

  const cidade = unidade ? `${unidade.cidade}/${unidade.uf}` : "";

  const FAQ = [
    { q: "Minha empresa pode contratar estagiário?",
      a: "Sim. Qualquer empresa — independente do porte — pode contratar estagiários, desde que as atividades sejam relacionadas ao curso do estudante. A Smarter orienta todo o processo conforme a Lei nº 11.788/2008." },
    { q: "A contratação gera vínculo empregatício?",
      a: "Não. O estágio não gera vínculo empregatício desde que seja formalizado corretamente pelo Termo de Compromisso de Estágio (TCE). A Smarter garante total conformidade jurídica." },
    { q: "Quanto tempo leva para contratar um estagiário?",
      a: "Em média entre 7 e 15 dias úteis após a definição do perfil. A Smarter já conta com uma rede ativa de estudantes e instituições parceiras, o que agiliza bastante o processo." },
    { q: "Quem faz o TCE e a documentação?",
      a: "A Smarter. Cuidamos de toda a documentação: TCE, plano de atividades, seguro contra acidentes pessoais e convênio com a instituição de ensino. Sua empresa só assina — tudo digital." },
    { q: "Preciso ter convênio com a faculdade?",
      a: "Não. A Smarter já possui convênio ativo com diversas instituições de ensino. Isso simplifica o processo e elimina uma etapa burocrática para a empresa." },
    { q: "Como funciona o seguro do estagiário?",
      a: "O seguro contra acidentes pessoais é obrigatório por lei e está incluso no processo gerenciado pela Smarter. Você não precisa se preocupar com contratação separada." },
    { q: "Posso participar da seleção e escolher o estagiário?",
      a: "Sim. A Smarter faz a triagem e encaminha os candidatos mais alinhados ao perfil da vaga. A entrevista final e a escolha são sempre da empresa." },
    { q: "Quem acompanha o estagiário durante o contrato?",
      a: "A Smarter realiza avaliações semestrais de desempenho e oferece suporte contínuo para empresa, estudante e instituição de ensino durante todo o período do estágio." },
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
            {[["Por que estagiários", "sec-2"], ["Como funciona", "sec-4"], ["Dúvidas", "sec-6"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-white/80 hover:text-white text-xs font-bold transition-colors">
                {l}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <CTABtn onClick={() => scrollTo("sec-form")} variant="yellow" className="hidden sm:inline-flex text-xs px-4 py-2">
              Receber proposta
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
            {[["Por que estagiários", "sec-2"], ["Como funciona", "sec-4"], ["Dúvidas", "sec-6"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left text-white/80 py-2 text-sm font-semibold">
                {l}
              </button>
            ))}
            <CTABtn onClick={() => scrollTo("sec-form")} variant="yellow" className="w-full mt-2">Receber proposta</CTABtn>
          </div>
        )}
      </header>

      {/* ══ SEC 1 — HERO ══════════════════════════════════════════════════════ */}
      <section id="sec-1" className="relative min-h-screen flex items-center bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#F4B400]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-80 h-80 bg-[#F4B400]/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-24 pt-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F4B400]/15 border border-[#F4B400]/30 text-[#F4B400] text-xs font-bold px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-[#F4B400] animate-pulse" />
                {unidade
                  ? <>Convite da unidade {unidade.name} · {cidade}</>
                  : <>Apresentação Comercial · Smarter Estágios</>}
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
                Sua empresa precisa de gente boa.{" "}
                <span className="text-[#F4B400]">Contratar não precisa ser caro nem lento.</span>
              </h1>

              <p className="text-white/70 text-lg leading-relaxed mb-3">
                A Smarter Estágios conecta sua empresa a estagiários selecionados com tecnologia
                e acompanhamento humano — com custo muito menor que uma contratação CLT
                e zero burocracia para você.
              </p>

              <p className="text-white/50 text-sm mb-8">
                Da triagem dos candidatos à documentação e ao acompanhamento: a Smarter cuida de tudo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <CTABtn onClick={() => scrollTo("sec-form")} variant="yellow" className="text-base px-7 py-4">
                  🎓 Quero contratar estagiários
                </CTABtn>
                {unidade?.whatsapp && (
                  <CTABtn onClick={() => handleWpp()} variant="outline" className="text-base px-7 py-4">
                    💬 Falar pelo WhatsApp
                  </CTABtn>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/10">
                {["✅ Lei nº 11.788/2008", "✅ Seguro incluso", "✅ Sem vínculo CLT", "✅ Processo 100% digital"].map(t => (
                  <span key={t} className="text-white/50 text-xs font-semibold">{t}</span>
                ))}
              </div>
            </div>

            {/* Formulário no hero (desktop) */}
            <div id="sec-form-desktop" className="hidden lg:block">
              <FormCaptacao unidade={unidade} />
            </div>
          </div>
        </div>
      </section>

      {/* ══ SEC 2 — A DOR ════════════════════════════════════════════════════ */}
      <section id="sec-2" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
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

            <div>
              <Tag>O desafio que você conhece</Tag>
              <h2 className="text-3xl font-black text-slate-800 mb-6">
                Se você já passou por isso,{" "}
                <span className="text-[#0D2B5C]">esta página é para a sua empresa.</span>
              </h2>

              <div className="space-y-3">
                {[
                  { icon: "💸", text: "Alto custo com contratações CLT, encargos e rescisões" },
                  { icon: "⏱️", text: "Semanas perdidas em processos seletivos sem resultado" },
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
                <p className="font-black text-sm mb-1">💡 O estágio resolve — quando é bem gerido</p>
                <p className="text-white/70 text-xs">Talento em formação, custo reduzido, sem vínculo empregatício e com segurança jurídica total. É exatamente isso que a Smarter entrega.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SEC 3 — TECNOLOGIA + HUMANIZAÇÃO ═════════════════════════════════ */}
      <section id="sec-3" className="py-20 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Tag>Tecnologia + Humanização</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Uma empresa de tecnologia que{" "}
              <span className="text-[#0D2B5C]">encontra os melhores estagiários</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Plataforma digital de ponta a ponta, com gente de verdade acompanhando cada etapa — para empresa, estudante e instituição de ensino.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🎯", title: "Triagem inteligente", desc: "Análise de perfil comportamental e matching entre candidato, vaga e cultura da sua empresa." },
              { icon: "📱", title: "Plataforma 100% digital", desc: "Vagas, documentos, assinaturas e acompanhamento em um único lugar — sem papel." },
              { icon: "⚖️", title: "Conformidade jurídica", desc: "Processo 100% conforme a Lei nº 11.788/2008. Sem riscos trabalhistas." },
              { icon: "🛡️", title: "Seguro incluso", desc: "Seguro contra acidentes pessoais do estagiário já incluído no processo." },
              { icon: "🤝", title: "Atendimento humanizado", desc: "Um especialista da sua região acompanha sua empresa do início ao fim." },
              { icon: "🏫", title: "Convênio com IES", desc: "Convênios ativos com instituições de ensino. Sem burocracia extra para você." },
              { icon: "📊", title: "Acompanhamento contínuo", desc: "Avaliações semestrais e relatórios de desempenho do estagiário." },
              { icon: "⚡", title: "Agilidade real", desc: "Em média 7 a 15 dias úteis entre a definição do perfil e o estagiário contratado." },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#0D2B5C]/8 flex items-center justify-center text-xl flex-shrink-0">
                  {c.icon}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{c.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <CTABtn onClick={() => scrollTo("sec-form")} variant="ghost" className="text-sm">
              Quero uma proposta para minha empresa →
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 4 — COMO FUNCIONA ════════════════════════════════════════════ */}
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
            <div>
              {[
                { title: "Você conta o que precisa", desc: "Cargo, perfil e horário. A Smarter divulga a vaga nos nossos canais e na rede de instituições parceiras." },
                { title: "Triagem com tecnologia", desc: "Nossa plataforma cruza perfil comportamental, curso e disponibilidade para selecionar os candidatos mais alinhados." },
                { title: "Você entrevista e escolhe", desc: "Recebe apenas os melhores perfis pré-selecionados. A decisão final é sempre da sua empresa." },
                { title: "Documentação 100% digital", desc: "TCE, plano de atividades e toda a documentação exigida pela legislação — assinado digitalmente." },
                { title: "Seguro e regularização", desc: "Inclusão do estagiário no seguro obrigatório e convênio com a instituição de ensino." },
                { title: "Acompanhamento contínuo", desc: "Avaliações semestrais, suporte humano e gestão do encerramento ao final do contrato." },
              ].map((s, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#F4B400] text-[#0D2B5C] flex items-center justify-center font-black text-sm shadow-md shadow-[#F4B400]/30">
                      {i + 1}
                    </div>
                    {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-[#F4B400]/40 to-transparent mt-1 min-h-6" />}
                  </div>
                  <div className="pb-7">
                    <p className="font-black text-white text-sm">{s.title}</p>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

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
            <CTABtn onClick={() => scrollTo("sec-form")} variant="yellow" className="text-base px-8 py-4">
              🎓 Quero abrir uma vaga agora
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 5 — COMPARATIVO ══════════════════════════════════════════════ */}
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
            <CTABtn onClick={() => scrollTo("sec-form")} variant="yellow" className="text-base px-8 py-4">
              🚀 Receber uma proposta gratuita
            </CTABtn>
          </div>
        </div>
      </section>

      {/* ══ SEC 6 — FAQ ══════════════════════════════════════════════════════ */}
      <section id="sec-6" className="py-20 bg-[#F5F7FA]">
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
        </div>
      </section>

      {/* ══ SEC 7 — FORMULÁRIO (CTA FINAL) ═══════════════════════════════════ */}
      <section id="sec-form" className="py-24 bg-gradient-to-br from-[#0D2B5C] via-[#0f3470] to-[#0a2047] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#F4B400]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F4B400]/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {unidade && (
                <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4">
                  {unidade.name} · {cidade}
                </p>
              )}
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-6">
                Sua empresa pode continuar perdendo tempo com recrutamento…{" "}
                <span className="text-[#F4B400]">ou pode deixar isso com a gente.</span>
              </h2>
              <p className="text-white/70 text-lg mb-8">
                Preencha o formulário ao lado e receba, sem compromisso, uma proposta
                personalizada para contratar estagiários na sua empresa.
              </p>

              {unidade && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-bold">Quem vai atender você</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F4B400] flex items-center justify-center text-[#0D2B5C] font-black">
                      {unidade.responsavel.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">{unidade.responsavel}</p>
                      <p className="text-white/60 text-xs">{unidade.name} — Smarter Estágios · {cidade}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    {unidade.whatsapp && (
                      <a href={wppLink() || "#"} target="_blank" rel="noopener noreferrer"
                        className="text-[#F4B400] text-sm font-bold hover:underline">
                        📱 {unidade.whatsapp}
                      </a>
                    )}
                    {unidade.email && (
                      <a href={`mailto:${unidade.email}`} className="text-white/50 text-sm hover:text-white transition-colors">
                        ✉️ {unidade.email}
                      </a>
                    )}
                    {unidade.instagram && (
                      <a href={`https://instagram.com/${unidade.instagram.replace(/^@/, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-white/50 text-sm hover:text-white transition-colors">
                        📸 {unidade.instagram}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <FormCaptacao unidade={unidade} />
            </div>
          </div>
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
              {unidade && <span>{unidade.name} · {cidade}</span>}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} Smarter Estágios. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ── BOTÃO FLUTUANTE WHATSAPP (mobile) ── */}
      {unidade?.whatsapp && (
        <div className="fixed bottom-6 right-4 z-40 md:hidden">
          <button
            onClick={() => handleWpp()}
            className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95"
            aria-label="Falar pelo WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
