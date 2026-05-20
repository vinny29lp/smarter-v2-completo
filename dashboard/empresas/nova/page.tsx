import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EmpresaForm } from "@/components/forms/EmpresaForm";
import Link from "next/link";

export default async function NovaEmpresaPage() {
  const session = await getServerSession(authOptions);
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/empresas" className="text-slate-400 hover:text-slate-600 text-sm">← Empresas</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Nova Empresa</h1>
      </div>
      <EmpresaForm franchiseId={session?.user?.franchiseId || ""} />
    </div>
  );
}
