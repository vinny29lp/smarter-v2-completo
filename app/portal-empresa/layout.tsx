import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalEmpresaNav } from "./PortalEmpresaNav";

export default async function PortalEmpresaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Middleware já garante o role, mas mantemos verificação server-side como fallback.
  // Admins (FRANQUEADORA/FRANQUEADO/FUNCIONARIO) também podem acessar /avaliacoes para visualizar.
  const ALLOWED = ["EMPRESA", "FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"];
  if (!session) redirect("/login");
  if (!ALLOWED.includes(session.user.role || "")) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <PortalEmpresaNav />
      <main className="max-w-6xl mx-auto w-full px-3 py-4 pb-20 sm:px-6 sm:py-8 md:pb-8">{children}</main>
    </div>
  );
}
