"use client";
import type { Regiao } from "@/lib/onboarding/regras";

/** Editor de regiões de atuação da franquia (Cidade + Bairro opcional, várias linhas). */
export function RegioesEditor({ value, onChange, ufPadrao }: { value: Regiao[]; onChange: (v: Regiao[]) => void; ufPadrao?: string }) {
  const set = (i: number, k: keyof Regiao, v: string) => onChange(value.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const cls = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]";
  return (
    <div className="space-y-2">
      {value.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input className={`${cls} col-span-5`} placeholder="Cidade *" value={r.cidade} onChange={e => set(i, "cidade", e.target.value)} />
          <input className={`${cls} col-span-2`} placeholder={ufPadrao || "UF"} maxLength={2} value={r.uf || ""} onChange={e => set(i, "uf", e.target.value.toUpperCase())} />
          <input className={`${cls} col-span-4`} placeholder="Bairro (opcional)" value={r.bairro || ""} onChange={e => set(i, "bairro", e.target.value)} />
          <button type="button" aria-label="Remover região" onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="col-span-1 text-slate-400 hover:text-red-500 text-lg">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { cidade: "", uf: ufPadrao || "" }])}
        className="text-xs font-bold text-[#0f2a5e] border border-dashed border-[#0f2a5e]/40 rounded-lg px-3 py-1.5 hover:bg-blue-50">
        + Adicionar cidade/bairro
      </button>
      <p className="text-[11px] text-slate-500">O Sales (Victor) prospecta somente nessas regiões. Deixe o bairro em branco para a cidade inteira.</p>
    </div>
  );
}
