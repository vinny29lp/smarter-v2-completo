import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanies } from "@/lib/actions/companies";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { EmpresasFilters } from "./EmpresasFilters";
import { ImportarEmpresasButton } from "@/components/empresas/ImportarEmpresasButton";

const statusBadge: Record<string, "green"|"gray"|"yellow"|"red"> = {
  ATIVA:"green", INATIVA:"gray", ATENCAO:"yellow", PENDENTE:"yellow"
};

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; cidade?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  // FRANQUEADORA vê todas; demais papéis só vêem as da sua unidade
  const filterFranchiseId = role === "FRANQUEADORA" ? undefined : (session?.user?.franchiseId || undefined);
  const all = await getCompanies(filterFranchiseId);

  let empresas = all;
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    empresas = empresas.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.cnpj.includes(q) ||
      (e.responsavel || "").toLowerCase().includes(q)
    );
  }
  if (searchParams.status) empresas = empresas.filter(e => e.status === searchParams.status);
  if (searchParams.cidade) empresas = empresas.filter(e =>
    e.cidade.toLowerCase().includes(searchParams.cidade!.toLowerCase())
  );

  const franchiseRef = session?.user?.franchiseId || undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {empresas.length} empresas{searchParams.q || searchParams.status ? " (filtrado)" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportarEmpresasButton />
          {/* Botão Nova Empresa — sem onClick, apenas Link */}
          <Link
            href="/dashboard/empresas/nova"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors"
          >
            + Nova Empresa
          </Link>
        </div>
      </div>

      {/* EmpresasFilters é Client Component — renderiza o botão de link e filtros */}
      <EmpresasFilters franchiseRef={franchiseRef} />

      <Card>
        <div className="overflow-x-auto -mx-1"><table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Empresa","CNPJ","Cidade","Responsável","Contratos","Vagas","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  Nenhuma empresa encontrada.{" "}
                  <Link href="/dashboard/empresas/nova" className="text-blue-500 hover:underline">
                    Criar a primeira →
                  </Link>
                </td>
              </tr>
            ) : empresas.map(e => (
              <tr
                key={e.id}
                className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${e.pendente ? "bg-amber-50/30" : ""}`}
              >
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-slate-800">{e.name}</p>
                  {e.pendente && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                      Auto cadastro
                    </span>
                  )}
                  {(e as any).origem === "MIGRADO" && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold ml-1">
                      Migrada — visível a todas unidades
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs font-mono text-slate-500">{e.cnpj}</td>
                <td className="px-5 py-3 text-sm">{e.cidade}/{e.uf}</td>
                <td className="px-5 py-3 text-sm text-slate-600">{e.responsavel || "—"}</td>
                <td className="px-5 py-3 text-center text-sm font-medium">{(e as any)._count?.contracts || 0}</td>
                <td className="px-5 py-3 text-center text-sm font-medium">{(e as any)._count?.vacancies || 0}</td>
                <td className="px-5 py-3">
                  <Badge variant={statusBadge[e.status || "ATIVA"] || "gray"}>{e.status}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/dashboard/empresas/${e.id}`}
                    className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}
