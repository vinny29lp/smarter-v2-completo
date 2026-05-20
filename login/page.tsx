"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SysConfig {
  nomeFantasia: string; loginTitulo: string; loginSubtitulo: string;
  loginSlogan: string; loginLogoUrl: string; loginBgUrl: string;
}

const DEFAULT_CFG: SysConfig = {
  nomeFantasia:   "Smarter Estágios",
  loginTitulo:    "Smarter Estágios",
  loginSubtitulo: "Sistema de Gestão de Estágios",
  loginSlogan:    "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
  loginLogoUrl:   "",
  loginBgUrl:     "",
};

const PORTAL_BY_ROLE: Record<string, string> = {
  FRANQUEADORA: "/dashboard",
  FRANQUEADO:   "/dashboard",
  EMPRESA:      "/portal-empresa",
  ESTUDANTE:    "/portal-estudante",
};

const DEMOS = [
  { label: "Franqueadora", email: "admin@smarter.com.br",      pass: "smarter123" },
  { label: "Franqueado",   email: "franqueado@smarter.com.br", pass: "franq123"   },
  { label: "Empresa",      email: "empresa@techcorp.com.br",   pass: "empresa123" },
  { label: "Estudante",    email: "estudante@email.com",       pass: "estud123"   },
];

export default function LoginPage() {
  const [cfg, setCfg]           = useState<SysConfig>(DEFAULT_CFG);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/app/config")
      .then(r => r.json())
      .then(d => { if (d.config) setCfg({ ...DEFAULT_CFG, ...d.config }); })
      .catch(() => {});
  }, []);

  const doLogin = async (e: string, p: string) => {
    setLoading(true); setError("");
    const res = await signIn("credentials", { email: e, password: p, redirect: false });
    if (res?.error) { setError("E-mail ou senha incorretos."); setLoading(false); return; }
    const session = await fetch("/api/auth/session").then(r => r.json());
    const dest = PORTAL_BY_ROLE[session?.user?.role] || "/dashboard";
    router.push(dest);
    router.refresh();
    setLoading(false);
  };

  const bgStyle = cfg.loginBgUrl
    ? { backgroundImage: `url(${cfg.loginBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #0f2a5e 0%, #1a3d8f 50%, #2d5be3 100%)" };

  return (
    <div className="min-h-screen flex" style={bgStyle}>
      {/* Overlay quando tem imagem de fundo */}
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

      {/* Card login */}
      <div className="relative flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
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

          <div className="mt-6">
            <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-wider mb-3">Acesso Rápido (Teste)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMOS.map(d => (
                <button key={d.label} onClick={() => doLogin(d.email, d.pass)} disabled={loading}
                  className="text-xs font-semibold py-2 px-3 rounded-xl border-2 border-slate-200 hover:border-[#0f2a5e] hover:bg-[#0f2a5e]/5 transition-all text-slate-600 disabled:opacity-50">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
