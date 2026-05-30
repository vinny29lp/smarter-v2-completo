"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

interface SysConfig {
  nomeFantasia: string; loginTitulo: string; loginSubtitulo: string;
  loginSlogan: string; loginLogoUrl: string; loginBgUrl: string;
}

const DEFAULT_CFG: SysConfig = {
  nomeFantasia:   "Sistema Smarter",
  loginTitulo:    "Sistema Smarter",
  loginSubtitulo: "Sistema de Gestão de Estágios",
  loginSlogan:    "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
  loginLogoUrl:   "",
  loginBgUrl:     "",
};


function LoginContent() {
  const [cfg, setCfg]           = useState<SysConfig>(DEFAULT_CFG);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  // Recuperação de senha
  const [showForgot, setShowForgot]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    fetch("/api/app/config")
      .then(r => r.json())
      .then(d => { if (d.config) setCfg({ ...DEFAULT_CFG, ...d.config }); })
      .catch(() => {});
  }, []);

  const doLogin = async (e: string, p: string) => {
    setLoading(true); setError("");
    const t0 = Date.now();
    const res = await signIn("credentials", { email: e, password: p, redirect: false });
    console.log(`[LOGIN] signIn concluído: ${Date.now() - t0}ms, ok=${res?.ok}, error=${res?.error}`);

    if (!res?.ok) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    // ⚡ OTIMIZAÇÃO CRÍTICA: eliminar fetch extra de /api/auth/session e router.refresh()
    // O middleware lê o JWT direto do cookie (sem DB) e redireciona para o portal correto.
    // router.refresh() causava double-render do dashboard (3-5s extras) — removido.
    // window.location.href = hard navigation limpa, sem reuso de estado do router
    const dest = callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard";
    console.log(`[LOGIN] redirecionando para ${dest} após ${Date.now() - t0}ms total`);
    window.location.href = dest;
    // setLoading(false) não necessário — página será substituída pelo redirect
  };

  const doForgot = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setForgotStatus("sending");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStatus("sent");
    } catch {
      setForgotStatus("error");
    }
  };

  const bgStyle = cfg.loginBgUrl
    ? { backgroundImage: `url(${cfg.loginBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #0f2a5e 0%, #1a3d8f 50%, #2d5be3 100%)" };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={bgStyle}>
      {cfg.loginBgUrl && <div className="absolute inset-0 bg-[#0f2a5e]/70"/>}

      {/* Branding */}
      <div className="relative hidden lg:flex flex-col justify-center px-16 flex-1 text-white">
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            {cfg.loginLogoUrl ? (
              <img src={cfg.loginLogoUrl} alt="logo" className="h-12 object-contain"/>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#f5c400] flex items-center justify-center font-black text-[#0f2a5e] text-xl">S</div>
            )}
            <span className="text-2xl font-black">{cfg.nomeFantasia}</span>
          </div>
          <h1 className="text-4xl font-black leading-tight mb-4">{cfg.loginTitulo}</h1>
          <p className="text-xl text-white/80 mb-2">{cfg.loginSubtitulo}</p>
          <p className="text-white/60 text-base">{cfg.loginSlogan}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[["Contratos Digitais","📄"],["Assinatura Digital","✍️"],["CRM Completo","📊"],["DISC + Matching","🧠"]].map(([l,i])=>(
            <div key={l} className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">{i}</span>
              <span className="text-sm font-semibold">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card login / recuperação de senha */}
      <div className="relative flex-1 flex items-center justify-center p-4 md:p-8 min-h-screen">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8">

          {!showForgot ? (
            <>
              <div className="text-center mb-8">
                {cfg.loginLogoUrl ? (
                  <img src={cfg.loginLogoUrl} alt="logo" className="h-14 mx-auto object-contain mb-4"/>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#0f2a5e] flex items-center justify-center font-black text-[#f5c400] text-2xl mx-auto mb-4">S</div>
                )}
                <h2 className="text-2xl font-black text-[#0f2a5e]">Bem-vindo(a)</h2>
                <p className="text-slate-500 text-sm mt-1">Acesse sua conta para continuar</p>
              </div>

              <form onSubmit={e => { e.preventDefault(); doLogin(email, password); }} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
                    placeholder="seu@email.com" required autoComplete="email"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
                    placeholder="••••••••" required autoComplete="current-password"/>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#0f2a5e] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3d8f] transition-colors disabled:opacity-50">
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="text-center mt-5">
                <button onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotStatus("idle"); }}
                  className="text-xs text-slate-400 hover:text-[#0f2a5e] transition-colors font-medium">
                  Esqueci minha senha
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#0f2a5e] flex items-center justify-center font-black text-[#f5c400] text-2xl mx-auto mb-4">🔑</div>
                <h2 className="text-2xl font-black text-[#0f2a5e]">Recuperar Senha</h2>
                <p className="text-slate-500 text-sm mt-1">Enviaremos uma nova senha por e-mail</p>
              </div>

              {forgotStatus === "sent" ? (
                <div className="text-center space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-emerald-700 font-bold text-sm">✅ E-mail enviado!</p>
                    <p className="text-emerald-600 text-xs mt-1">
                      Se este e-mail estiver cadastrado, você receberá uma nova senha em instantes.
                    </p>
                  </div>
                  <button onClick={() => { setShowForgot(false); setForgotStatus("idle"); }}
                    className="text-xs text-[#0f2a5e] font-bold hover:underline">
                    ← Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={doForgot} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">E-mail cadastrado</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
                      placeholder="seu@email.com" required autoComplete="email"/>
                  </div>
                  {forgotStatus === "error" && (
                    <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">Erro ao enviar. Tente novamente.</p>
                  )}
                  <button type="submit" disabled={forgotStatus === "sending"}
                    className="w-full bg-[#0f2a5e] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3d8f] transition-colors disabled:opacity-50">
                    {forgotStatus === "sending" ? "Enviando..." : "Enviar Nova Senha"}
                  </button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setShowForgot(false); setForgotStatus("idle"); }}
                      className="text-xs text-slate-400 hover:text-[#0f2a5e] transition-colors font-medium">
                      ← Voltar ao login
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0f2a5e]"><div className="text-white text-sm">Carregando...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
