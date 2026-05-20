import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstudanteForm } from "@/components/forms/EstudanteForm";
import Link from "next/link";

export default async function NovoEstudantePage() {
  const session = await getServerSession(authOptions);
  const institutions = await prisma.institution.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/estudantes" className="text-slate-400 hover:text-slate-600 text-sm">← Estudantes</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Novo Estudante</h1>
      </div>
      <EstudanteForm franchiseId={session?.user?.franchiseId || ""} institutions={institutions} />
    </div>
  );
}
