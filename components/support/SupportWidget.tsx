"use client";

import { useState } from "react";
import { SupportCaseForm } from "./SupportCaseForm";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar suporte de TI" : "Abrir suporte de TI"}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#0f2a5e] px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#15367a]"
      >
        <span aria-hidden="true">{open ? "✕" : "🛠️"}</span>
        <span className="hidden sm:inline">Suporte TI</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[70vh] max-h-[620px] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between bg-[#0f2a5e] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Suporte de TI</p>
              <p className="text-[11px] text-blue-200">Abra um chamado de erro ou bug</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg px-2 py-1 hover:bg-white/10">✕</button>
          </div>
          <SupportCaseForm onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
