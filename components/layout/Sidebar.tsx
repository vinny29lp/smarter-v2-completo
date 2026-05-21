"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Building2, GraduationCap, Briefcase, FileText, DollarSign, Phone, Users, Star, Settings, Shield, LogOut, KanbanSquare, PenTool, BookOpen, Activity } from "lucide-react";
import clsx from "clsx";

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
  EMPRESA: [[]], // Nunca deve aparecer - middleware redireciona para /portal-empresa
  ESTUDANTE: [[]], // Nunca deve aparecer - middleware redireciona para /portal-estudante
  FRANQUEADO: [[
    {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
  ],[
    {href:"/dashboard/empresas",label:"Empresas",icon:Building2},
    {href:"/dashboard/estudantes",label:"Estudantes",icon:GraduationCap},
    {href:"/dashboard/vagas",label:"Vagas",icon:Briefcase},
    {href:"/dashboard/processos",label:"Processos Seletivos",icon:KanbanSquare},
    {href:"/dashboard/contratos",label:"Contratos",icon:FileText},
    {href:"/dashboard/assinaturas",label:"Assinaturas",icon:PenTool},
  ],[
    {href:"/dashboard/financeiro",label:"Financeiro",icon:DollarSign},
    {href:"/dashboard/crm",label:"CRM",icon:Phone},
    {href:"/dashboard/gamificacao",label:"Gamificação",icon:Star},
    {href:"/dashboard/equipe",label:"Equipe",icon:Users},
  ]],
};

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "FRANQUEADO";
  const sections = navByRole[role] || navByRole["FRANQUEADO"];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0f2a5e] flex flex-col z-40">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo-branca.png" alt="Smarter Estágios" className="h-9 object-contain"/>
        </div>
        <div className="mt-2 text-[10px] text-white/40 uppercase tracking-wider">{role}</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {sections.map((group, gi) => (
          <div key={gi} className="mb-5">
            {group.map(item => {
              const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
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
            {session?.user?.name?.split(" ").map(n=>n[0]).slice(0,2).join("") || "SM"}
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
