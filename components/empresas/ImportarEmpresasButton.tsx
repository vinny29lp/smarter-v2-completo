"use client";
import { useState } from "react";
import { ImportarEmpresasModal } from "./ImportarEmpresasModal";

export function ImportarEmpresasButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
      >
        📥 Importar Empresas
      </button>
      {open && (
        <ImportarEmpresasModal
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
