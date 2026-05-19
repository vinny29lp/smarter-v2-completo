import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Segurança extra no servidor — EMPRESA e ESTUDANTE nunca devem chegar aqui
  const role = session.user.role;
  if (role === "EMPRESA")   redirect("/portal-empresa");
  if (role === "ESTUDANTE") redirect("/portal-estudante");

  return (
    <div className="flex h-screen bg-[#f0f4f8] overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <header className="sticky top-0 bg-white border-b border-slate-100 h-14 flex items-center justify-between px-7 z-30 shadow-sm">
          <h1 className="text-[16px] font-bold text-slate-800">Smarter One V2</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#f5c400] text-[#0f2a5e] font-bold px-3 py-1.5 rounded-xl">
              {session.user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
    </div>
  );
}
