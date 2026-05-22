import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalEstudanteNav } from "./PortalEstudanteNav";

export default async function PortalEstudanteLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ESTUDANTE") redirect("/login");

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <PortalEstudanteNav />
      <main className="max-w-5xl mx-auto w-full px-3 py-4 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
