"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Building2, GraduationCap, Briefcase, FileText, DollarSign, Phone, Users, Star, Settings, Shield, LogOut, KanbanSquare, PenTool, BookOpen, Activity, Menu, X, MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

// Mapa de permissao-key → item de nav (para FUNCIONARIO)
const PERM_NAV_MAP: Record<string, {href:string;label:string;icon:any}> = {
  financeiro:    {href:"/dashboard/financeiro",   label:"Financeiro",          icon:DollarSign},
  contratos:     {href:"/dashboard/contratos",    label:"Contratos",           icon:FileText},
  estudantes:    {href:"/dashboard/estudantes",   label:"Estudantes",          icon:GraduationCap},
  empresas:      {href:"/dashboard/empresas",     label:"Empresas",            icon:Building2},
  vagas:         {href:"/dashboard/vagas",        label:"Vagas",               icon:Briefcase},
  processos:     {href:"/dashboard/processos",    label:"Processos Seletivos", icon:KanbanSquare},
  crm:           {href:"/dashboard/crm",          label:"CRM",                 icon:Phone},
  instituicoes:  {href:"/dashboard/instituicoes", label:"Instituições",        icon:BookOpen},
  configuracoes: {href:"/dashboard/configuracoes",label:"Configurações",       icon:Settings},
  assinaturas:   {href:"/dashboard/assinaturas",  label:"Assinaturas",         icon:PenTool},
};

// Bottom nav items for mobile — most important 4 + "Mais"
const mobileNavByRole: Record<string, {href:string;label:string;icon:any}[]> = {
  FRANQUEADORA: [
    {href:"/dashboard",           label:"Início",      icon:LayoutDashboard},
    {href:"/dashboard/empresas",  label:"Empresas",    icon:Building2},
    {href:"/dashboard/estudantes",label:"Estudantes",  icon:GraduationCap},
    {href:"/dashboard/contratos", label:"Contratos",   icon:FileText},
    {href:"/dashboard/financeiro",label:"Financeiro",  icon:DollarSign},
  ],
  FRANQUEADO: [
    {href:"/dashboard",           label:"Início",      icon:LayoutDashboard},
    {href:"/dashboard/empresas",  label:"Empresas",    icon:Building2},
    {href:"/dashboard/estudantes",label:"Estudantes",  icon:GraduationCap},
    {href:"/dashboard/contratos", label:"Contratos",   icon:FileText},
    {href:"/dashboard/financeiro",label:"Financeiro",  icon:DollarSign},
  ],
};

const navByRole: Record<string, {href:string;label:string;icon:any;badge?:number}[][]> = {
  FRANQUEADORA: [[
    {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
    {href:"/dashboard/franqueados",label:"Franqueados",icon:Users},
    {href:"/dashboard/engajamento",label:"Engajamento",icon:Activity},
  ],[
    {href:"/dashboard/empresas",label:"Empresas",icon:Building2},
    {href:"/dashboard/estudantes",label:"Estudantes",icon:GraduationCap},
    {href:"/dashboard/vagas",label:"Vagas",icon:Briefcase},
    {href:"/dashboard/processos",label:"Processos Seletivos",icon:KanbanSquare},
    {href:"/dashboard/contratos",label:"Contratos",icon:FileText},
    {href:"/dashboard/assinaturas",label:"Assinaturas",icon:PenTool},
    {href:"/dashboard/instituicoes",label:"Instituições",icon:BookOpen},
  ],[
    {href:"/dashboard/financeiro",label:"Financeiro",icon:DollarSign},
    {href:"/dashboard/crm",label:"CRM",icon:Phone},
    {href:"/dashboard/seguros",label:"Seguros",icon:Shield},
    {href:"/dashboard/gamificacao",label:"Gamificação",icon:Star},
    {href:"/dashboard/equipe",label:"Equipe",icon:Users},
    {href:"/dashboard/configuracoes",label:"Configurações",icon:Settings},
  ]],
  EMPRESA: [[]],
  ESTUDANTE: [[]],
  FRANQUEADO: [[
    {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
  ],[
    {href:"/dashboard/empresas",label:"Empresas",icon:Building2},
    {href:"/dashboard/estudantes",label:"Estudantes",icon:GraduationCap},
    {href:"/dashboard/vagas",label:"Vagas",icon:Briefcase},
    {href:"/dashboard/processos",label:"Processos Seletivos",icon:KanbanSquare},
    {href:"/dashboard/contratos",label:"Contratos",icon:FileText},
    {href:"/dashboard/assinaturas",label:"Assinaturas",icon:PenTool},
    {href:"/dashboard/instituicoes",label:"Instituições",icon:BookOpen},
  ],[
    {href:"/dashboard/financeiro",label:"Financeiro",icon:DollarSign},
    {href:"/dashboard/crm",label:"CRM",icon:Phone},
    {href:"/dashboard/gamificacao",label:"Gamificação",icon:Star},
    {href:"/dashboard/equipe",label:"Equipe",icon:Users},
  ]],
};

function SidebarPanel({ onClose }: { onClose?: () => void }) {
  const path = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "FRANQUEADO";

  // Para FUNCIONARIO, monta o menu apenas com os módulos autorizados
  const sections: {href:string;label:string;icon:any;badge?:number}[][] = role === "FUNCIONARIO"
    ? [[
        {href:"/dashboard", label:"Dashboard", icon:LayoutDashboard},
        ...((session?.user?.permissoes ?? [])
          .map(p => PERM_NAV_MAP[p])
          .filter(Boolean)),
      ]]
    : (navByRole[role] || navByRole["FRANQUEADO"]);

  return (
    <aside className="flex flex-col h-full w-60 bg-[#0f2a5e]">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-sistema.png" alt="Sistema Smarter" className="h-9 object-contain"/>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/60 hover:text-white md:hidden p-1">
              <X size={18}/>
            </button>
          )}
        </div>
        <div className="mt-2 text-[10px] text-white/40 uppercase tracking-wider">{role}</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {sections.map((group, gi) => (
          <div key={gi} className="mb-5">
            {group.map(item => {
              const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={onClose}
                  className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium mb-0.5 transition-all",
                    active ? "bg-[#f5c400] text-[#0f2a5e] font-bold" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                  <item.icon size={15} className="shrink-0"/>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full">{item.badge}</span>}
                </Link>
              );
            })}
            {gi < sections.length - 1 && <div className="border-t border-white/10 my-2"/>}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5c400] flex items-center justify-center text-xs font-black text-[#0f2a5e] overflow-hidden">
            {session?.user?.name?.split(" ").map((n: string) => n[0]).slice(0,2).join("") || "SM"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{session?.user?.name || "Usuario"}</div>
            <div className="text-white/40 text-[10px] truncate">{session?.user?.email}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-white/40 hover:text-white p-1">
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const path = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const role = session?.user?.role || "FRANQUEADO";
  // Para FUNCIONARIO, monta o bottom nav a partir das permissoes
  const items: {href:string;label:string;icon:any}[] = role === "FUNCIONARIO"
    ? [
        {href:"/dashboard", label:"Início", icon:LayoutDashboard},
        ...((session?.user?.permissoes ?? [])
          .map(p => PERM_NAV_MAP[p])
          .filter(Boolean)),
      ]
    : (mobileNavByRole[role] || mobileNavByRole["FRANQUEADO"]);

  return (
    <>
      {/* Overlay for "Mais" drawer */}
      {moreOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMoreOpen(false)}/>
      )}

      {/* "Mais" slide-up drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden p-4 pb-6">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Menu Completo</p>
          <SidebarPanel onClose={() => setMoreOpen(false)}/>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-stretch z-40 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {items.slice(0, 4).map(item => {
          const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-all",
                active ? "text-[#0f2a5e]" : "text-slate-400 hover:text-slate-600"
              )}>
              <div className={clsx(
                "p-1.5 rounded-xl transition-all",
                active ? "bg-[#f5c400]" : ""
              )}>
                <item.icon size={20} className={active ? "text-[#0f2a5e]" : ""}/>
              </div>
              <span className={clsx("text-[10px] font-semibold leading-none", active ? "text-[#0f2a5e]" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        {/* Mais button */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 transition-all",
            moreOpen ? "text-[#0f2a5e]" : "text-slate-400"
          )}>
          <div className={clsx("p-1.5 rounded-xl", moreOpen ? "bg-[#f5c400]" : "")}>
            <MoreHorizontal size={20} className={moreOpen ? "text-[#0f2a5e]" : ""}/>
          </div>
          <span className="text-[10px] font-semibold leading-none">Mais</span>
        </button>
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Mobile bottom navigation — only on mobile */}
      <MobileBottomNav/>

      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:block fixed left-0 top-0 h-screen z-40">
        <SidebarPanel/>
      </div>
    </>
  );
}
