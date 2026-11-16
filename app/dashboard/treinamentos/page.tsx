import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { janelaTreinamento } from "@/lib/treinamentos/janela";
import { TreinamentosClient } from "./TreinamentosClient";

export const dynamic = "force-dynamic";

export default async function TreinamentosPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const franchiseId = session?.user?.franchiseId;
  let diasRestantes: number | null = null;
  let ativo = true;

  // Franqueadora vê sempre; unidade vê durante 3 meses.
  if ((role === "FRANQUEADO" || role === "FUNCIONARIO") && franchiseId && franchiseId !== "FRANQUEADORA") {
    const f = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { createdAt: true } });
    const j = janelaTreinamento(f?.createdAt);
    ativo = j.ativo;
    diasRestantes = j.diasRestantes;
  }

  if (!ativo) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 max-w-2xl">
        <h2 className="text-lg font-bold text-slate-800">Treinamentos</h2>
        <p className="mt-2 text-sm text-slate-600">O período de 3 meses do treinamento inicial terminou. Em breve, a Universidade Smarter ficará disponível aqui de forma permanente.</p>
      </div>
    );
  }
  return <TreinamentosClient diasRestantes={diasRestantes} />;
}
