"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface Props {
  diasParaBloquear: number;
  urgente: boolean; // dia >= 3
}

export function MesAvisos({ diasParaBloquear, urgente }: Props) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 px-4 py-2.5 text-xs md:text-sm font-semibold " +
        (urgente ? "bg-orange-500 text-white" : "bg-amber-400 text-[#0f2a5e]")
      }
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>
          Faça a abertura do mês até o dia 5 para não ter o sistema bloqueado.{" "}
          {diasParaBloquear > 0
            ? `${diasParaBloquear} dia(s) restante(s).`
            : "Hoje é o último dia."}
        </span>
      </div>
      <Link
        href="/dashboard/mes/abrir"
        className={
          "shrink-0 px-3 py-1 rounded-lg font-bold whitespace-nowrap " +
          (urgente ? "bg-white text-orange-600" : "bg-[#0f2a5e] text-white")
        }
      >
        Abrir Mês →
      </Link>
    </div>
  );
}
