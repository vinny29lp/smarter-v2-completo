import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card }  from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function EmpresaFinanceiro() {
  const session  = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return <p className="text-slate-400 text-center py-12">Empresa não vinculada.</p>;

  const lancamentos = await prisma.financial.findMany({
    where: { companyId, cancelado: false },
    orderBy: { createdAt: "desc" },
  });

  const pago     = lancamentos.filter(l => l.status === "PAGO").reduce((a, b) => a + b.valor, 0);
  const pendente = lancamentos.filter(l => l.status === "PENDENTE").reduce((a, b) => a + b.valor, 0);
  const vencidos = lancamentos.filter(l =>
    l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date()
  );
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Financeiro</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-400">Total Pago</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(pago)}</p>
        </Card>
        <Card className="p-5 border-l-4 border-amber-400">
          <p className="text-xs text-slate-400">A Pagar</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{fmt(pendente)}</p>
        </Card>
        <Card className={`p-5 border-l-4 ${vencidos.length > 0 ? "border-red-400" : "border-slate-200"}`}>
          <p className="text-xs text-slate-400">Cobranças Vencidas</p>
          <p className={`text-2xl font-black mt-1 ${vencidos.length > 0 ? "text-red-600" : "text-slate-400"}`}>
            {vencidos.length}
          </p>
        </Card>
      </div>

      {vencidos.length > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-bold text-red-800">
            ⚠️ Você tem {vencidos.length} cobrança(s) vencida(s). Entre em contato com seu consultor Smarter.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {lancamentos.length === 0 ? (
          <Card className="p-10 text-center text-slate-400">Nenhum lançamento encontrado.</Card>
        ) : lancamentos.map(l => {
          const vencido    = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
          const temPix     = !!(l as any).chavePix;
          const temBoleto  = !!(l as any).linkPagamento;
          const temInstrucao = !!(l as any).instrucaoPagamento;
          return (
            <Card key={l.id} className={`p-5 ${vencido ? "border border-red-200 bg-red-50/20" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{l.descricao}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {l.vencimentoAt ? `Vence: ${new Date(l.vencimentoAt).toLocaleDateString("pt-BR")}` : "Sem vencimento"}
                    {vencido && <span className="ml-1 text-red-500 font-bold">⚠️ Vencida</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-800">{fmt(l.valor)}</p>
                  <Badge variant={l.status === "PAGO" ? "green" : vencido ? "red" : "yellow"}>{l.status}</Badge>
                </div>
              </div>

              {/* Dados de pagamento fornecidos pelo franqueado */}
              {(temPix || temBoleto || temInstrucao) && l.status === "PENDENTE" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-blue-800">💳 Dados para pagamento</p>

                  {temPix && (
                    <div>
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Chave PIX</p>
                      <p className="text-sm font-mono font-bold text-blue-900 select-all">
                        {(l as any).chavePix}
                      </p>
                    </div>
                  )}

                  {temBoleto && (
                    <a
                      href={(l as any).linkPagamento}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      📄 Visualizar Boleto →
                    </a>
                  )}

                  {temInstrucao && (
                    <div>
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Instruções</p>
                      <p className="text-xs text-blue-800">{(l as any).instrucaoPagamento}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
