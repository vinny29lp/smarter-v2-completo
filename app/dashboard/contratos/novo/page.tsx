import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContratoForm } from "@/components/forms/ContratoForm";
import Link from "next/link";

// Busca de estudantes/empresas/instituições agora é feita sob demanda via autocomplete
// no próprio ContratoForm — sem carregamento de toda a base na renderização da página.
export default async function NovoContratoPage() {
  const session = await getServerSession(authOptions);
  const fid = session?.user?.franchiseId;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/contratos" className="text-slate-400 hover:text-slate-600 text-sm">← Contratos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Novo Estágio</h1>
      </div>
      <ContratoForm franchiseId={fid || ""} />
    </div>
  );
}
