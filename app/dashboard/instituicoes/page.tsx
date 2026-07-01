import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InstituicoesTable } from "./InstituicoesTable";

export default async function InstituicoesPage() {
  const [session, instituicoes] = await Promise.all([
    getServerSession(authOptions),
    prisma.institution.findMany({
      include: { _count: { select: { students: true, contracts: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const isFranqueadora = session?.user?.role === "FRANQUEADORA";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Instituições de Ensino</h1>
          <p className="text-slate-500 text-sm mt-1">{instituicoes.length} instituições cadastradas</p>
        </div>
        <Link href="/dashboard/instituicoes/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors">
          + Nova Instituição
        </Link>
      </div>

      <InstituicoesTable instituicoes={instituicoes as any} isFranqueadora={isFranqueadora} />
    </div>
  );
}
