import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default async function FranqueadosPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") redirect("/dashboard");

  const franqueados = await prisma.franchise.findMany({
    include: {
      users: {
        where: { role: "FRANQUEADO" },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true },
        take: 1,
      },
      _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
    },
    orderBy: { pontuacao: "desc" },
  });

  const ativos = franqueados.filter(f => f.status === "ATIVO").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Franqueados</h1>
          <p className="text-slate-500 text-sm mt-1">{franqueados.length} unidades • {ativos} ativas</p>
        </div>
        <Link href="/dashboard/franqueados/novo"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors">
          + Novo Franqueado
        </Link>
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["#","Unidade","Responsável","E-mail","Cidade","Empresas","Contratos","Último Acesso","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {franqueados.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">
                Nenhum franqueado cadastrado.{" "}
                <Link href="/dashboard/franqueados/novo" className="text-blue-500 hover:underline">Criar o primeiro →</Link>
              </td></tr>
            ) : franqueados.map((f, i) => {
              const user = f.users[0];
              const bloqueado = user && !user.active;
              return (
                <tr key={f.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${bloqueado ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{i+1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.cnpj || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{f.responsavel}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{user?.email || f.email}</td>
                  <td className="px-4 py-3 text-sm">{f.cidade}/{f.uf}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{(f._count as any).companies}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{(f._count as any).contracts}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    {bloqueado
                      ? <Badge variant="red">Bloqueado</Badge>
                      : <Badge variant={f.status === "ATIVO" ? "green" : "gray"}>{f.status}</Badge>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/franqueados/${f.id}`}
                      className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors">
                      Gerenciar →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
