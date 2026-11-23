import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CadastroForm } from "./CadastroForm";

export const metadata: Metadata = { title: "Cadastro de fechamento | Franquia Smarter", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CadastroPage({ params }: { params: { token: string } }) {
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { nomeCompleto: true, email: true, telefone: true, cidade: true, estado: true, situacao: true, contratoDocId: true } });
  if (!lead || lead.situacao === "perdido") notFound();
  if (lead.contratoDocId) return <main className="p-8 text-center text-slate-700">Seu contrato já foi enviado para assinatura. Confira o seu e-mail.</main>;
  return <CadastroForm token={params.token} inicial={{ nome: lead.nomeCompleto, email: lead.email || "", telefone: lead.telefone || "", cidade: lead.cidade || "", uf: lead.estado || "" }} />;
}
