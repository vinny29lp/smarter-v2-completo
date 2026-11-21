import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TreinamentoInicial } from "./TreinamentoInicial";

export const dynamic = "force-dynamic";

export default async function TreinamentoInicialPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if ((role !== "FRANQUEADO" && role !== "FUNCIONARIO") || !franchiseId || franchiseId === "FRANQUEADORA") redirect("/dashboard");
  const f: any = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { quizObrigatorio: true, quizAprovadoEm: true } as any });
  if (!f?.quizObrigatorio || f?.quizAprovadoEm) redirect("/dashboard");
  return <TreinamentoInicial podeResponder={role === "FRANQUEADO"} />;
}
