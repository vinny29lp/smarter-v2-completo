"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/portal-estudante",               label: "Início" },
  { href: "/portal-estudante/curriculo",     label: "Meu Currículo" },
  { href: "/portal-estudante/vagas",         label: "Vagas" },
  { href: "/portal-estudante/candidaturas",  label: "Candidaturas" },
  { href: "/portal-estudante/estagio",       label: "Meu Estágio" },
  { href: "/portal-estudante/avaliacoes",    label: "Avaliações" },
  { href: "/portal-estudante/disc",          label: "Teste DISC" },
];

export function PortalEstudanteNav() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[#0f2a5e] shadow-lg sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo-branca.png" alt="Smarter" className="h-8 object-contain"/>
            <span className="text-white font-bold text-sm">Portal do Estudante</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1">
            {NAV.map(item => {
              const active = path === item.href || (item.href !== "/portal-estudante" && path.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    active ? "bg-[#f5c400] text-[#0f2a5e]" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: Sair + mobile hamburger */}
          <div className="flex items-center gap-2">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/60 hover:text-white text-xs font-semibold transition-colors">
              Sair →
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Abrir menu"
            >
              {menuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0c2151] border-t border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV.map(item => {
              const active = path === item.href || (item.href !== "/portal-estudante" && path.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active ? "bg-[#f5c400] text-[#0f2a5e]" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
