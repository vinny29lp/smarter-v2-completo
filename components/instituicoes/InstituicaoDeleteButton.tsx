"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  studentCount: number;
  contractCount: number;
}

export function InstituicaoDeleteButton({ id, name, studentCount, contractCount }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const temVinculos = studentCount > 0 || contractCount > 0;

  return (
    <>
      <button
        onClick={() => { setError(""); setConfirming(true); }}
        title={temVinculos
          ? `Possui ${studentCount} estudante(s) e ${contractCount} contrato(s) — não pode excluir`
          : "Excluir instituição"}
        className="text-xs border border-red-200 hover:border-red-400 text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
      >
        🗑️
      </button>

      {confirming && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => { if (!loading) { setConfirming(false); setError(""); } }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 mb-3">Excluir Instituição</h3>

            {temVinculos ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <p className="text-sm font-bold text-amber-800">⚠️ Não é possível excluir</p>
                <p className="text-sm text-amber-700 mt-1">
                  <strong>{name}</strong> possui {studentCount > 0 ? `${studentCount} estudante(s)` : ""}
                  {studentCount > 0 && contractCount > 0 ? " e " : ""}
                  {contractCount > 0 ? `${contractCount} contrato(s)` : ""} vinculados.
                  <br />Desvincule-os antes de excluir.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <p className="text-sm font-bold text-red-800">⚠️ Ação irreversível</p>
                <p className="text-sm text-red-700 mt-1">
                  Excluir permanentemente <strong>{name}</strong>?
                </p>
              </div>
            )}

            {error && <p className="text-xs text-red-600 mb-3 font-medium">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirming(false); setError(""); }}
                className="flex-1 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {temVinculos ? "Entendido" : "Cancelar"}
              </button>
              {!temVinculos && (
                <button
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const res = await fetch(`/api/app/instituicoes/${id}`, { method: "DELETE" });
                      const d = await res.json();
                      if (d.error) { setError(d.error); setLoading(false); return; }
                      setConfirming(false);
                      router.refresh();
                    } catch {
                      setError("Erro ao excluir. Tente novamente.");
                      setLoading(false);
                    }
                  }}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? "Excluindo..." : "Sim, Excluir"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
