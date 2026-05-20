import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudents } from "@/lib/actions/students";
import { getCompanies } from "@/lib/actions/companies";
import { prisma } from "@/lib/prisma";
import { ContratoForm } from "@/components/forms/ContratoForm";
import Link from "next/link";

export default async function NovoContratoPage() {
  const session = await getServerSession(authOptions);
  const fid = session?.user?.franchiseId;
  const [students, companies, institutions] = await Promise.all([
    getStudents(fid),
    getCompanies(fid),
    prisma.institution.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/contratos" className="text-slate-400 hover:text-slate-600 text-sm">← Contratos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Novo Estágio</h1>
      </div>
      <ContratoForm franchiseId={fid||""} students={students} companies={companies} institutions={institutions}/>
    </div>
  );
}
