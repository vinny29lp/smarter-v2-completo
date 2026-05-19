import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";
type V = "primary"|"secondary"|"yellow"|"danger"|"ghost";
const vm: Record<V,string> = {
  primary:"bg-[#0f2a5e] text-white hover:bg-[#1a3d8f]",
  secondary:"bg-white text-slate-700 border border-slate-200 hover:border-blue-400",
  yellow:"bg-[#f5c400] text-[#0f2a5e] hover:bg-[#ffd93d] font-bold",
  danger:"bg-red-500 text-white hover:bg-red-600",
  ghost:"text-slate-600 hover:bg-slate-100",
};
const sm = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-5 py-2.5 text-base" };
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: V; size?: "sm"|"md"|"lg"; }
export function Button({ variant="primary", size="md", className, children, ...props }: Props) {
  return <button className={clsx("inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all cursor-pointer",vm[variant],sm[size],className)} {...props}>{children}</button>;
}
