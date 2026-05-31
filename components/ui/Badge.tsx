import clsx from "clsx";
type V = "green"|"red"|"yellow"|"blue"|"gray"|"purple"|"orange";
const vm: Record<V,string> = {
  green:"bg-emerald-100 text-emerald-700",red:"bg-red-100 text-red-700",
  yellow:"bg-amber-100 text-amber-700",blue:"bg-blue-100 text-blue-700",
  gray:"bg-slate-100 text-slate-600",purple:"bg-violet-100 text-violet-700",
  orange:"bg-orange-100 text-orange-700",
};
export function Badge({ variant="gray", children, className }: { variant?: V; children: React.ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", vm[variant], className)}>{children}</span>;
}
