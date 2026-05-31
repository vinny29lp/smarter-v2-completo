"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/portal-empresa",              label: "Início" },
  { href: "/portal-empresa/estagiarios",  label: "Meus Estagiários" },
  { href: "/portal-empresa/documentos",   label: "Documentos" },
  { href: "/portal-empresa/financeiro",   label: "Financeiro" },
  { href: "/portal-empresa/avaliacoes",   label: "Avaliações" },
  { href: "/portal-empresa/solicitar",    label: "Solicitar Estagiário" },
];

export function PortalEmpresaNav() {
  const path = usePathname();
  return (
    <header className="bg-[#0f2a5e] shadow-lg sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f5c400] rounded-lg flex items-center justify-center font-black text-[#0f2a5e] text-sm">S</div>
            <span className="text-white font-bold text-sm">Portal da Empresa</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map(item => {
              const active = path === item.href || (item.href !== "/portal-empresa" && path.startsWith(item.href));
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
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/60 hover:text-white text-xs font-semibold transition-colors">
            Sair →
          </button>
        </div>
      </div>
    </header>
  );
}
