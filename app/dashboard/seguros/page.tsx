import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegurosClient } from "./SegurosClient";

export default async function SegurosPage({ searchParams }: { searchParams: { mes?: string; ano?: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") redirect("/dashboard");

  const agora = new Date();
  const mes = parseInt(searchParams.mes || String(agora.getMonth() + 1));
  const ano = parseInt(searchParams.ano || String(agora.getFullYear()));
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);

  const [ativos, encerrados] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: { in: ["ATIVO", "PENDENTE", "AGUARDANDO_ASSINATURA"] },
        dataInicio: { lte: fim },
        dataFim: { gte: inicio },
      },
      include: { student: true, company: true, franchise: true },
      orderBy: { dataInicio: "desc" },
    }),
    prisma.contract.findMany({
      where: {
        status: { in: ["FINALIZADO", "INATIVO", "SUSPENSO"] },
        updatedAt: { gte: inicio, lte: fim },
      },
      include: { student: true, company: true, franchise: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const APOLICE = "212709/M-65358303000126";
  const SEGURADORA = "PORTO SEGURO S.A";
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <SegurosClient
      ativos={ativos} encerrados={encerrados}
      mes={mes} ano={ano} meses={meses}
      apolice={APOLICE} seguradora={SEGURADORA}
    />
  );
}
