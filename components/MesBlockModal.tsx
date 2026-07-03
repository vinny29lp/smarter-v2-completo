"use client";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  mes: number;
  ano: number;
}

export function MesBlockModal({ mes, ano }: Props) {
  const router = useRouter();
  const nomeMes = NOMES_MES[mes - 1] || mes;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-slate-800 mb-3">Abertura do Mês Obrigatória</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Você não realizou a abertura do mês de <strong>{nomeMes}/{ano}</strong>. Para continuar
          usando o sistema, faça a abertura agora.
        </p>
        <button
          onClick={() => router.push("/dashboard/mes/abrir")}
          className="inline-flex items-center justify-center gap-2 bg-[#0f2a5e] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1a3d8f] transition-colors w-full"
        >
          Abrir Mês Agora <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
