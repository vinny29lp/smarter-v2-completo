import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudents } from "@/lib/actions/students";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { EstudantesFilters } from "./EstudantesFilters";
import { ImportarEstudantesButton } from "@/components/estudantes/ImportarEstudantesButton";

const statusBadge: Record<string,"green"|"yellow"|"gray"|"red"> = {
  DISPONIVEL:"yellow", EM_ESTAGIO:"green", INATIVO:"gray", FORMADO:"gray"
};
const discColor: Record<string,string> = {
  D:"bg-red-100 text-red-700", I:"bg-amber-100 text-amber-700",
  S:"bg-emerald-100 text-emerald-700", C:"bg-blue-100 text-blue-700"
};

function buildPageUrl(
  sp: { q?:string; status?:string; cidade?:string; disc?:string; curso?:string },
  newPage: number
): string {
  const p = new URLSearchParams();
  if (sp.q)       p.set("q",       sp.q);
  if (sp.status)  p.set("status",  sp.status);
  if (sp.cidade)  p.set("cidade",  sp.cidade);
  if (sp.disc)    p.set("disc",    sp.disc);
  if (sp.curso)   p.set("curso",   sp.curso);
  if (newPage > 1) p.set("page",   String(newPage));
  const qs = p.toString();
  return qs ? `?${qs}` : "?";
}

export default async function EstudantesPage({ searchParams }: {
  searchParams: { q?:string; status?:string; cidade?:string; disc?:string; curso?:string; page?:string }
}) {
  const session = await getServerSession(authOptions);
  const page = Math.max(1, parseInt(searchParams.page || "1"));

  // Filtros e paginação feitos direto no banco
  const result = await getStudents({
    page,
    q:       searchParams.q,
    status:  searchParams.status,
    cidade:  searchParams.cidade,
    disc:    searchParams.disc,
    curso:   searchParams.curso,
  });

  const { students: estudantes, total, totalPages } = result;
  const franchiseRef = session?.user?.franchiseId || undefined;

  const inicio = (page - 1) * result.pageSize + 1;
  const fim    = Math.min(page * result.pageSize, total);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Estudantes</h1>
          <p className="text-slate-500 text-sm mt-1">{total} estudantes no total</p>
        </div>
        <div className="flex gap-2">
          <ImportarEstudantesButton />
          <Link href="/dashboard/estudantes/novo"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors">
            + Novo Estudante
          </Link>
        </div>
      </div>

      <EstudantesFilters franchiseRef={franchiseRef} />

      <Card>
        <div className="overflow-x-auto"><table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Nome","Curso","Cidade","Instituição","DISC","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estudantes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                Nenhum estudante encontrado.{" "}
                <Link href="/dashboard/estudantes/novo" className="text-blue-500 hover:underline">Cadastrar →</Link>
              </td></tr>
            ) : estudantes.map(e => (
              <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.email}</p>
                </td>
                <td className="px-5 py-3 text-sm text-slate-600">{e.curso || "—"}</td>
                <td className="px-5 py-3 text-sm">{e.cidade && e.uf ? `${e.cidade}/${e.uf}` : "—"}</td>
                <td className="px-5 py-3 text-sm text-slate-500">{(e as any).institution?.name || "—"}</td>
                <td className="px-5 py-3">
                  {e.discResult
                    ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${discColor[e.discResult]||"bg-slate-100 text-slate-600"}`}>{e.discResult}</span>
                    : "—"}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={statusBadge[e.status || "ATIVO"]||"gray"}>{e.status}</Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <Link href={`/dashboard/estudantes/${e.id}`}>
                      <button className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-2.5 py-1.5 rounded-lg font-semibold transition-colors">Ver →</button>
                    </Link>
                    <Link href={`/dashboard/estudantes/${e.id}?acao=processo`}>
                      <button className="text-xs border border-blue-200 hover:border-blue-500 text-blue-600 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">+ Vaga</button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        {/* Paginação */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              {total === 0 ? "0 resultados" : `${inicio}–${fim} de ${total} estudantes`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={buildPageUrl(searchParams, page - 1)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-sm border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">← Anterior</span>
                )}
                <span className="text-sm text-slate-500 px-1">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={buildPageUrl(searchParams, page + 1)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                    Próximo →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-sm border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">Próximo →</span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
