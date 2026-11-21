import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingLia } from "./OnboardingLia";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "FRANQUEADO" && role !== "FUNCIONARIO") redirect("/dashboard");
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (franchiseId && franchiseId !== "FRANQUEADORA") {
    try {
      const q: any = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { quizObrigatorio: true, quizAprovadoEm: true } as any });
      if (q?.quizObrigatorio && !q?.quizAprovadoEm) redirect("/treinamento-inicial");
    } catch (e: any) { if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e; }
  }
  return <OnboardingLia podeEditar={role === "FRANQUEADO"} />;
}
