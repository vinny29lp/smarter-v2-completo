import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STATUS_LABEL: Record<string, string> = {
  NAO_GERADO: "Não gerado", RASCUNHO: "Rascunho", GERADO: "Gerado",
  ENVIADO_ASSINATURA: "Enviado", AGUARDANDO_ASSINATURA: "Aguardando Assinatura",
  ASSINADO: "Assinado ✓", CANCELADO: "Cancelado",
};
const STATUS_BADGE: Record<string, "green"|"yellow"|"blue"|"gray"|"purple"|"red"> = {
  NAO_GERADO: "gray", RASCUNHO: "yellow", GERADO: "purple",
  ENVIADO_ASSINATURA: "blue", AGUARDANDO_ASSINATURA: "yellow",
  ASSINADO: "green", CANCELADO: "red",
};

export default async function EmpresaDocumentos() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return <p className="text-slate-400 text-center py-12">Empresa não vinculada.</p>;

  const contratos = await prisma.contract.findMany({
    where: { companyId },
    include: {
      student: { select: { name: true } },
      documents: { orderBy: { tipo: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allDocs = contratos.flatMap(c =>
    c.documents.map(d => ({ ...d, studentName: c.student.name }))
  );
  const gerados = allDocs.filter(d => d.status !== "NAO_GERADO");
  const aguardando = gerados.filter(d => d.status === "AGUARDANDO_ASSINATURA");
  const assinados = gerados.filter(d => d.status === "ASSINADO");
  const outros = gerados.filter(d => !["AGUARDANDO_ASSINATURA","ASSINADO"].includes(d.status || ""));

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Documentos</h1>

      {gerados.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-slate-500 text-sm">Nenhum documento gerado ainda.</p>
        </Card>
      ) : (
        <>
          {aguardando.length > 0 && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800">
                ⚠️ {aguardando.length} documento(s) aguardando sua assinatura
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Entre em contato com seu consultor Smarter para assinar digitalmente.
              </p>
            </div>
          )}

          {[
            { docs: aguardando, title: "⏳ Aguardando Assinatura" },
            { docs: outros,     title: "📄 Outros Documentos" },
            { docs: assinados,  title: "✅ Assinados" },
          ].filter(g => g.docs.length > 0).map(g => (
            <div key={g.title} className="mb-6">
              <h3 className="text-sm font-bold text-slate-600 mb-3">{g.title} ({g.docs.length})</h3>
              <Card>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Documento","Estagiário","Status"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.docs.map(d => (
                      <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-semibold">{d.titulo}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{d.studentName}</td>
                        <td className="px-5 py-3">
                          <Badge variant={STATUS_BADGE[d.status || "PENDENTE"]}>{STATUS_LABEL[d.status || "PENDENTE"]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
