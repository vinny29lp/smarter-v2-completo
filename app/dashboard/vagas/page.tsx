import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVacancies } from "@/lib/actions/vacancies";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const POR_PAGINA = 40;

export default async function VagasPage({ searchParams }: { searchParams?: { unidade?: string; pagina?: string } }) {
  const session = await getServerSession(authOptions);
  const ehFranqueadora = session?.user?.role === "FRANQUEADORA";
  const pagina = Math.max(1, parseInt(searchParams?.pagina || "1") || 1);
  // Só a Franqueadora filtra por unidade; as unidades veem apenas as próprias vagas (getVacancies já restringe).
  const unidade = ehFranqueadora ? (searchParams?.unidade || "") : "";

  let vagas: Awaited<ReturnType<typeof getVacancies>>["vagas"] = [];
  let total = 0, totalPages = 1, abertas = 0;
  let unidades: { id: string; name: string }[] = [];
  try {
    const [result, lista, qtdAbertas] = await Promise.all([
      getVacancies(session?.user?.franchiseId, session?.user?.companyId, pagina, POR_PAGINA, unidade || undefined),
      ehFranqueadora ? prisma.franchise.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
      prisma.vacancy.count({
        where: {
          status: "ABERTA",
          ...(ehFranqueadora ? (unidade ? { franchiseId: unidade } : {}) : { franchiseId: session?.user?.franchiseId || "-" }),
          ...(session?.user?.companyId ? { companyId: session.user.companyId } : {}),
        },
      }),
    ]);
    vagas = result.vagas; total = result.total; totalPages = result.totalPages; abertas = qtdAbertas; unidades = lista;
  } catch (err) {
    console.error("[dashboard/vagas] erro ao carregar vagas:", err);
  }
  const hrefPagina = (n: number) => `/dashboard/vagas?${new URLSearchParams({ ...(unidade ? { unidade } : {}), pagina: String(n) })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Vagas</h1>
          <p className="text-slate-500 text-sm mt-1">{abertas} abertas • {total} total</p>
        </div>
        <Link href="/dashboard/vagas/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors">
          + Nova Vaga
        </Link>
      </div>

      {ehFranqueadora && (
        <form method="get" className="mb-5 flex items-center gap-2">
          <label htmlFor="unidade" className="text-sm font-semibold text-slate-600">Unidade</label>
          <select id="unidade" name="unidade" defaultValue={unidade}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 min-w-[220px]">
            <option value="">Todas as unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f]">Filtrar</button>
          {unidade && <Link href="/dashboard/vagas" className="text-sm text-blue-500 hover:underline">Limpar</Link>}
        </form>
      )}

      {vagas.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">💼</p>
          <p className="text-slate-600 font-semibold">Nenhuma vaga cadastrada</p>
          <p className="text-slate-400 text-sm mt-1">Crie a primeira vaga para começar o processo seletivo.</p>
          <Link href="/dashboard/vagas/nova" className="mt-4 inline-flex text-sm text-blue-500 hover:underline">+ Criar primeira vaga</Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {vagas.map(v => (
            <Card key={v.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{v.titulo}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{v.company.name} • {v.cidade && v.uf ? `${v.cidade}/${v.uf}` : "—"}</p>
                  {ehFranqueadora && (v as any).franchise?.name && (
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">🏢 {(v as any).franchise.name}</p>
                  )}
                </div>
                <Badge variant={v.status === "ABERTA" ? "green" : v.status === "PAUSADA" ? "yellow" : "gray"}>
                  {v.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span>💰 R$ {v.bolsa.toLocaleString("pt-BR")}/mês</span>
                <span>⏱ {v.cargaHoraria}h/sem</span>
                <span>👥 {(v as any)._count.applications} candidatos</span>
                {v.modalidade && <span>🏢 {v.modalidade}</span>}
              </div>

              <div className="flex items-center gap-2 mb-3">
                {v.area && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{v.area}</span>}
                {v.discDesejado && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">DISC: {v.discDesejado}</span>}
              </div>

              <Link href={`/dashboard/vagas/${v.id}`}
                className="block text-center text-xs bg-slate-100 hover:bg-[#0f2a5e] hover:text-white text-slate-700 py-2 rounded-xl font-semibold transition-colors">
                Ver detalhes e candidatos →
              </Link>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-sm">
          {pagina > 1 && <Link href={hrefPagina(pagina - 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">← Anterior</Link>}
          <span className="text-slate-500">Página {pagina} de {totalPages}</span>
          {pagina < totalPages && <Link href={hrefPagina(pagina + 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
