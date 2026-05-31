import clsx from "clsx";
import { InputHTMLAttributes } from "react";
interface Props extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export function Input({ label, error, className, ...props }: Props) {
  return (
    <div className="w-full">
      {label && <label className="text-xs font-bold text-slate-600 block mb-1">{label}</label>}
      <input className={clsx("w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] transition-colors bg-white", className)} {...props}/>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
