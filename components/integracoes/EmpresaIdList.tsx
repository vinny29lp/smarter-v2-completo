"use client";
import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";

export interface EmpresaOpcao {
  id: string;
  name: string;
  cnpj: string;
}

function CopyId({ id }: { id: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
      onClick={async () => {
        await navigator.clipboard.writeText(id);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
    >
      {copiado ? <Check size={12} /> : <Copy size={12} />}
      {copiado ? "Copiado!" : "Copiar ID"}
    </button>
  );
}

export function EmpresaIdList({ empresas }: { empresas: EmpresaOpcao[] }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
        Company ID para colar na Alizo
      </p>
      <p className="text-xs text-slate-400 mb-3">
        A Alizo cria as vagas vinculadas a uma empresa específica da sua unidade. Copie o ID
        da empresa que vai receber essas vagas e cole no campo correspondente na configuração
        da unidade dentro da Alizo.
      </p>
      {empresas.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sua unidade ainda não tem nenhuma empresa cadastrada.{" "}
          <Link href="/dashboard/empresas" className="text-blue-600 underline">
            Cadastrar uma empresa
          </Link>
        </p>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {empresas.map(e => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{e.name}</p>
                <code className="text-[11px] text-slate-400">{e.id}</code>
              </div>
              <CopyId id={e.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
