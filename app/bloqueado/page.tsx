/**
 * Página exibida ao FRANQUEADO/FUNCIONARIO cuja unidade está com acesso
 * bloqueado por inadimplência (ou bloqueio manual do admin).
 * Mostra as cobranças em aberto com os meios de pagamento e orienta o contato.
 * Se a unidade não estiver (mais) bloqueada, redireciona de volta ao dashboard.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export default async function BloqueadoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const franchiseId = session.user.franchiseId;

  // Só faz sentido para usuários de unidade — os demais voltam para suas áreas
  if (role === "FRANQUEADORA" || !franchiseId || franchiseId === "FRANQUEADORA") redirect("/dashboard");
  if (role === "EMPRESA") redirect("/portal-empresa");
  if (role === "ESTUDANTE") redirect("/portal-estudante");

  const franchise: any = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: {
      name: true, acessoBloqueado: true, bloqueadoEm: true,
      bloqueioMotivo: true, bloqueioLiberadoAte: true,
    } as any,
  });

  const emTolerancia = franchise?.bloqueioLiberadoAte && new Date(franchise.bloqueioLiberadoAte) > new Date();
  if (!franchise?.acessoBloqueado || emTolerancia) redirect("/dashboard");

  const cobrancas = await prisma.financial.findMany({
    where: {
      franchiseId,
      categoria: "Franquia",
      status: { in: ["PENDENTE", "VENCIDO"] },
      cancelado: { not: true },
    },
    select: {
      id: true, descricao: true, valor: true, vencimentoAt: true,
      linkPagamento: true, chavePix: true, status: true,
    },
    orderBy: { vencimentoAt: "asc" },
  });

  const total = cobrancas.reduce((a, b) => a + b.valor, 0);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-red-600 px-8 py-6">
          <h1 className="text-white text-xl font-black">🔒 Acesso temporariamente suspenso</h1>
          <p className="text-red-100 text-sm mt-1">{franchise.name}</p>
        </div>
        <div className="p-8">
          <p className="text-slate-600 text-sm leading-relaxed">
            O acesso da sua unidade ao Sistema Smarter foi suspenso por pendência financeira
            na <strong>Taxa de Desenvolvimento de Rede</strong>. Assim que o pagamento for
            confirmado — ou a liberação for concedida pela Franqueadora — o acesso é
            restabelecido automaticamente.
          </p>

          {cobrancas.length > 0 && (
            <div className="mt-6 border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Cobranças em aberto</span>
                <span className="text-sm font-black text-red-700">{fmt(total)}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {cobrancas.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{c.descricao}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Vencimento: {c.vencimentoAt ? new Date(c.vencimentoAt).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-red-600 whitespace-nowrap">{fmt(c.valor)}</span>
                    </div>
                    {(c.linkPagamento || c.chavePix) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.linkPagamento && (
                          <a href={c.linkPagamento} target="_blank" rel="noopener noreferrer"
                             className="text-xs font-bold text-blue-600 underline">📄 Pagar boleto</a>
                        )}
                        {c.chavePix && (
                          <span className="text-xs text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded break-all">
                            PIX: {c.chavePix.length > 60 ? c.chavePix.slice(0, 60) + "…" : c.chavePix}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700">
              💬 Já pagou ou quer negociar? Fale com a Franqueadora:{" "}
              <a href="mailto:financeiro@smarterestagios.com.br" className="font-bold underline">
                financeiro@smarterestagios.com.br
              </a>
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link href="/dashboard" className="text-xs text-slate-400 underline">Verificar novamente</Link>
            <Link href="/api/auth/signout" className="text-xs font-bold text-slate-500 underline">Sair</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
