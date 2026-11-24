import { UniversidadeCard } from "@/components/treinamento/UniversidadeCard";

export const dynamic = "force-dynamic";

/** Treinamentos: local único = Universidade Smarter (login único com o painel). Vale para todas as unidades, novas e antigas. */
export default function TreinamentosPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Treinamentos 🎓</h2>
        <p className="mt-1 text-sm text-slate-500">Todo o treinamento da rede está na Universidade Smarter. Disponível o tempo todo, para unidades novas e antigas.</p>
      </div>
      <UniversidadeCard />
    </div>
  );
}
