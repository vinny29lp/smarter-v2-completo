import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalEmpresaNav } from "./PortalEmpresaNav";

export default async function PortalEmpresaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Middleware já garante o role, mas mantemos verificação server-side como fallback
  if (!session) redirect("/login");
  if (session.user.role !== "EMPRESA") redirect("/login");

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <PortalEmpresaNav />
      <main className="max-w-6xl mx-auto w-full px-3 py-4 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
