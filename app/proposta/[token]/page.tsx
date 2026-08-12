import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropostaView } from "./PropostaView";

export const metadata: Metadata = {
  title: "Proposta Comercial | Smarter Estágios",
};

// Página pública — sempre dinâmica (busca a empresa pelo token e registra a visualização)
export const dynamic = "force-dynamic";

export default async function PropostaPage({ params }: { params: { token: string } }) {
  const empresa = await prisma.company.findUnique({
    where: { proposalToken: params.token } as any,
    include: { franchise: true },
  });

  if (!empresa || !(empresa as any).valorGestao) notFound();

  const jaVisualizada = !!(empresa as any).proposalViewedAt;
  const proposalStatus = (empresa as any).proposalStatus as string;

  // Marca visualização apenas no primeiro acesso — não regride status já avançado (ACEITA/RECUSADA)
  if (!jaVisualizada && !["ACEITA", "RECUSADA"].includes(proposalStatus)) {
    await prisma.company.update({
      where: { id: empresa.id },
      data: { proposalViewedAt: new Date(), proposalStatus: "VISUALIZADA" } as any,
    });
  }

  return (
    <PropostaView
      empresa={{
        id: empresa.id,
        name: empresa.name,
        responsavel: empresa.responsavel,
        valorGestao: (empresa as any).valorGestao,
        proposalStatus: ["ACEITA", "RECUSADA"].includes(proposalStatus) ? proposalStatus : "VISUALIZADA",
        proposalSentAt: (empresa as any).proposalSentAt ? (empresa as any).proposalSentAt.toISOString() : null,
      }}
      unidade={{
        name: empresa.franchise?.name || "Smarter Estágios",
        cidade: empresa.franchise?.cidade || null,
        uf: empresa.franchise?.uf || null,
        responsavel: empresa.franchise?.responsavel || null,
        whatsapp: empresa.franchise?.whatsapp || null,
      }}
      token={params.token}
    />
  );
}
