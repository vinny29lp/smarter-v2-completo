import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const DOC_STATUS_BADGE: Record<string,"green"|"yellow"|"blue"|"gray"|"purple"|"red"> = {
  NAO_GERADO:"gray", RASCUNHO:"yellow", GERADO:"purple",
  AGUARDANDO_ASSINATURA:"yellow", ENVIADO_ASSINATURA:"blue",
  ASSINADO:"green", CANCELADO:"red",
};
const DOC_STATUS_LABEL: Record<string,string> = {
  NAO_GERADO:"Não gerado", RASCUNHO:"Rascunho", GERADO:"Gerado",
  AGUARDANDO_ASSINATURA:"Aguardando Assinatura", ENVIADO_ASSINATURA:"Enviado",
  ASSINADO:"Assinado ✓", CANCELADO:"Cancelado",
};

export default async function EstudanteContrato() {
  const session = await getServerSession(authOptions);
  const studentId = session?.user?.studentId;

  if (!studentId) {
    return <p className="text-slate-400 text-center py-12">Perfil de estudante não encontrado.</p>;
  }

  const contratos = await prisma.contract.findMany({
    where: { studentId },
    include: {
      company: { select: { name: true, cnpj: true, endereco: true, telefone: true } },
      institution: { select: { name: true } },
      documents: { orderBy: { tipo: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (contratos.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-black text-slate-800 mb-6">Meu Estágio</h1>
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-slate-600 font-semibold">Nenhum contrato de estágio encontrado.</p>
          <p className="text-slate-400 text-sm mt-1">
            Quando você for contratado, as informações aparecerão aqui.
          </p>
        </Card>
      </div>
    );
  }

  const contrato = contratos[0]; // mais recente

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Meu Estágio</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Empresa", contrato.company.name],
          ["Bolsa",   `R$ ${contrato.bolsa.toLocaleString("pt-BR")}/mês`],
          ["Início",  new Date(contrato.dataInicio).toLocaleDateString("pt-BR")],
          ["Término", new Date(contrato.dataFim).toLocaleDateString("pt-BR")],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">{l}</p>
            <p className="text-sm font-bold mt-0.5">{v}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Dados do Estágio</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Empresa",    contrato.company.name],
              ["CNPJ",       contrato.company.cnpj],
              ["Contato",    contrato.company.telefone],
              ["Supervisor", contrato.supervisorNome],
              ["Jornada",    `${contrato.chDiaria}h/dia · ${contrato.chSemanal}h/sem`],
              ["Horário",    `${contrato.horarioInicio} – ${contrato.horarioFim}`],
              ["Tipo",       contrato.tipoEstagio],
              ["Instituição",contrato.institution?.name],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l}>
                <p className="text-[10px] text-slate-400 uppercase">{l}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Atividades</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {contrato.atividades || "Não informado."}
          </p>
          {contrato.apoliceSeguro && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase">Seguro de vida</p>
              <p className="text-xs font-medium">{contrato.apoliceSeguro} · {contrato.seguradora}</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">📄 Documentos do Contrato</h3>
        <div className="space-y-2">
          {contrato.documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-sm font-medium">{doc.titulo}</p>
              <Badge variant={DOC_STATUS_BADGE[doc.status || "PENDENTE"] || "gray"}>
                {DOC_STATUS_LABEL[doc.status || "PENDENTE"] || doc.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Outros contratos anteriores */}
      {contratos.length > 1 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            Contratos anteriores ({contratos.length - 1})
          </p>
          <div className="space-y-2">
            {contratos.slice(1).map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold">{c.company.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(c.dataInicio).toLocaleDateString("pt-BR")} →{" "}
                    {new Date(c.dataFim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={c.status === "ATIVO" ? "green" : "gray"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
