import { prisma } from "@/lib/prisma";
import { ParceriaLanding } from "./ParceriaLanding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contrate Estagiários sem Burocracia | Smarter Estágios",
  description:
    "Encontre os melhores estagiários para sua empresa com tecnologia, triagem inteligente e gestão completa — 100% conforme a Lei nº 11.788/2008.",
};

// Página pública de captação — sempre dinâmica (busca dados da unidade pelo ?ref=)
export const dynamic = "force-dynamic";

export interface UnidadePublica {
  id: string;
  name: string;
  responsavel: string;
  cidade: string;
  uf: string;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
}

export default async function ParceriaPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  let unidade: UnidadePublica | null = null;

  // ?ref=FRANCHISE_ID → landing personalizada com dados da unidade.
  // Ref ausente/inválido/inativo → landing genérica (lead vai para a FRANQUEADORA,
  // mesmo comportamento do /api/public/lead).
  const ref = searchParams.ref;
  if (ref && ref !== "FRANQUEADORA") {
    try {
      const f = await prisma.franchise.findUnique({
        where: { id: ref },
        select: {
          id: true, name: true, responsavel: true, cidade: true, uf: true,
          whatsapp: true, instagram: true, email: true, status: true,
        },
      });
      if (f && f.status === "ATIVO") {
        unidade = {
          id: f.id, name: f.name, responsavel: f.responsavel,
          cidade: f.cidade, uf: f.uf,
          whatsapp: f.whatsapp, instagram: f.instagram, email: f.email,
        };
      }
    } catch {
      // ref malformado → segue como landing genérica
    }
  }

  return <ParceriaLanding unidade={unidade} />;
}
