import { HTMLAttributes } from "react";
import clsx from "clsx";
export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("bg-white rounded-2xl border border-slate-100 shadow-sm", className)} {...props}>{children}</div>;
}
