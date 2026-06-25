import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SolicitarVagaForm } from "./SolicitarVagaForm";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { empresa?: string };
}

export default async function SolicitarVagaPage({ searchParams }: Props) {
  const empresaId = searchParams.empresa || "";

  let empresa: { name: string; cidade: string; uf: string } | null = null;
  if (empresaId) {
    const found = await prisma.company.findUnique({
      where: { id: empresaId },
      select: { name: true, cidade: true, uf: true },
    });
    empresa = found;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center">
        <p className="text-white text-sm">Carregando...</p>
      </div>
    }>
      <SolicitarVagaForm empresa={empresa} />
    </Suspense>
  );
}
