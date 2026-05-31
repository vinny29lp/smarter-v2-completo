"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, FileText, Briefcase, ClipboardList, GraduationCap, Star, Activity, MoreHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

const NAV = [
  { href: "/portal-estudante",              label: "Início",        icon: Home },
  { href: "/portal-estudante/curriculo",    label: "Meu Currículo", icon: FileText },
  { href: "/portal-estudante/vagas",        label: "Vagas",         icon: Briefcase },
  { href: "/portal-estudante/candidaturas", label: "Candidaturas",  icon: ClipboardList },
  { href: "/portal-estudante/estagio",      label: "Meu Estágio",   icon: GraduationCap },
  { href: "/portal-estudante/avaliacoes",   label: "Avaliações",    icon: Star },
  { href: "/portal-estudante/disc",         label: "Teste DISC",    icon: Activity },
];

// First 4 in bottom bar, rest in "Mais"
const BOTTOM = NAV.slice(0, 4);
const EXTRA  = NAV.slice(4);

export function PortalEstudanteNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/portal-estudante" ? path === href : path.startsWith(href);

  return (
    <>
      {/* ── Top header (always) ── */}
      <header className="bg-[#0f2a5e] shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <img src="/logo-sistema.png" alt="Sistema Smarter" className="h-7 sm:h-8 object-contain"/>
              <span className="text-white font-bold text-xs sm:text-sm">Portal do Estudante</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-1">
              {NAV.map(item => (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive(item.href) ? "bg-[#f5c400] text-[#0f2a5e]" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/60 hover:text-white text-xs font-semibold transition-colors">
              Sair →
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <>
        {/* Overlay */}
        {moreOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMoreOpen(false)}/>
        )}

        {/* "Mais" drawer */}
        {moreOpen && (
          <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden">
            <div className="p-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mais opções</p>
                <button onClick={() => setMoreOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18}/>
                </button>
              </div>
              {EXTRA.map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1 font-semibold text-sm transition-colors",
                    isActive(item.href) ? "bg-[#f5c400] text-[#0f2a5e]" : "text-slate-700 hover:bg-slate-100"
                  )}>
                  <item.icon size={18}/>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom nav bar */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-stretch z-40 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {BOTTOM.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-all",
                  active ? "text-[#0f2a5e]" : "text-slate-400"
                )}>
                <div className={clsx("p-1.5 rounded-xl", active ? "bg-[#f5c400]" : "")}>
                  <item.icon size={20} className={active ? "text-[#0f2a5e]" : ""}/>
                </div>
                <span className={clsx("text-[10px] font-semibold leading-none", active ? "text-[#0f2a5e]" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              moreOpen ? "text-[#0f2a5e]" : "text-slate-400"
            )}>
            <div className={clsx("p-1.5 rounded-xl", moreOpen ? "bg-[#f5c400]" : "")}>
              <MoreHorizontal size={20} className={moreOpen ? "text-[#0f2a5e]" : ""}/>
            </div>
            <span className="text-[10px] font-semibold leading-none">Mais</span>
          </button>
        </nav>
      </>
    </>
  );
}
