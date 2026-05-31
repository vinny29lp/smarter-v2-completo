"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
const sizes = { sm:"max-w-sm",md:"max-w-md",lg:"max-w-2xl",xl:"max-w-4xl" };
interface Props { open: boolean; onClose: ()=>void; title?: string; children: React.ReactNode; size?: "sm"|"md"|"lg"|"xl"; }
export function Modal({ open, onClose, title, children, size="md" }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full p-6", sizes[size])}>
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
