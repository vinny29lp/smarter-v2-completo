"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ImportResult {
  importados: number;
  duplicados: number;
  erros: number;
  total: number;
  detalhes: { linha: number; nome: string; status: string; motivo?: string }[];
}

export default function ImportarFranquiaLeadsPage() {
  const [csv, setCsv]           = useState<string>("");
  const [origem, setOrigem]     = useState("meta_ads");
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [preview, setPreview]   = useState<string[][]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsv(text);
      // Preview das 5 primeiras linhas
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 6);
      const sep   = lines[0]?.includes("\t") ? "\t" : ",";
      setPreview(lines.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim())));
    };
    reader.readAsText(file, "UTF-8");
  }

  async function importar() {
    if (!csv) return alert("Selecione um arquivo CSV primeiro");
    setImporting(true);
    setResult(null);
    try {
      const r = await fetch("/api/app/franquia-crm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, origem }),
      });
      const d = await r.json();
      if (r.ok) setResult(d);
      else alert(d.error || "Erro na importação");
    } catch {
      alert("Erro ao enviar o arquivo");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link href="/dashboard/franquia-crm" className="hover:text-blue-800">🏢 CRM Franquias</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">Importar Leads</span>
      </div>

      <h1 className="text-2xl font-black text-slate-900 mb-1">📥 Importar Leads do Meta Ads</h1>
      <p className="text-slate-500 text-sm mb-6">
        Importe leads captados de campanhas pagas. O sistema detecta automaticamente leads frios (captados há mais de 6 meses).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-700 mb-3">1. Selecione o arquivo CSV</p>

            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-semibold text-slate-700">Arraste o CSV aqui ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">Formatos aceitos: .csv (vírgula ou tab como separador)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {csv && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                ✅ Arquivo carregado — {csv.split("\n").length - 1} linhas detectadas
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-700 mb-3">2. Origem dos leads</p>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            >
              <option value="meta_ads">Meta Ads (Facebook/Instagram)</option>
              <option value="google_ads">Google Ads</option>
              <option value="evento">Evento / Feira</option>
              <option value="indicacao">Indicação</option>
              <option value="organico">Orgânico (Site/Landing Page)</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <Button
            onClick={importar}
            disabled={importing || !csv}
            className="w-full bg-blue-900 hover:bg-blue-800 text-base py-5"
          >
            {importing ? "⏳ Importando..." : "🚀 Importar Leads"}
          </Button>
        </div>

        {/* Instruções + Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-700 mb-3">📋 Colunas aceitas (Meta Ads)</p>
            <div className="space-y-2">
              {[
                { col: "nome_completo / nome", obs: "Nome do lead (obrigatório)", req: true },
                { col: "telefone / celular",   obs: "WhatsApp do lead", req: false },
                { col: "email / e-mail",       obs: "E-mail de contato", req: false },
                { col: "cidade / city",        obs: "Cidade de origem", req: false },
                { col: "estado / uf",          obs: "Estado (ex: SP)", req: false },
                { col: "hora de criação",      obs: "Data do lead (detecta leads frios automaticamente)", req: false },
              ].map((c) => (
                <div key={c.col} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-white ${c.req ? "bg-red-500" : "bg-slate-400"}`}>
                    {c.req ? "REQ" : "OPC"}
                  </span>
                  <div>
                    <code className="text-blue-700 font-semibold">{c.col}</code>
                    <span className="text-slate-500 ml-1">— {c.obs}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              💡 <strong>Lead Frio:</strong> Se a coluna "hora de criação" estiver presente e a data for há mais de 6 meses, o lead será marcado automaticamente como 🧊 frio.
            </div>
          </div>

          {/* Preview da planilha */}
          {preview.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-700 mb-3">👁 Preview (5 primeiras linhas)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {preview[0].map((h, i) => (
                        <th key={i} className="bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="even:bg-slate-50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-slate-200 px-2 py-1.5 text-slate-700 max-w-[120px] truncate">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">📊 Resultado da Importação</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total",      val: result.total,      color: "text-blue-900" },
              { label: "Importados", val: result.importados, color: "text-green-600" },
              { label: "Duplicados", val: result.duplicados, color: "text-yellow-600" },
              { label: "Erros",      val: result.erros,      color: "text-red-600"   },
            ].map((k) => (
              <div key={k.label} className="text-center border border-slate-200 rounded-xl p-4">
                <p className={`text-3xl font-black ${k.color}`}>{k.val}</p>
                <p className="text-xs text-slate-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {result.importados > 0 && (
            <div className="flex gap-3 mb-4">
              <Link href="/dashboard/franquia-crm">
                <Button className="bg-blue-900 hover:bg-blue-800">
                  Ver leads importados →
                </Button>
              </Link>
              <Link href="/dashboard/franquia-crm?frio=true">
                <Button variant="ghost" className="text-cyan-700 border-cyan-300">
                  🧊 Ver somente leads frios
                </Button>
              </Link>
            </div>
          )}

          {result.detalhes.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Linha</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Nome</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.detalhes.map((d, i) => (
                    <tr key={i} className={
                      d.status.includes("importado") ? "bg-green-50" :
                      d.status === "duplicado" ? "bg-yellow-50" : "bg-red-50"
                    }>
                      <td className="px-3 py-1.5 text-slate-500">{d.linha}</td>
                      <td className="px-3 py-1.5 text-slate-800 font-medium">{d.nome}</td>
                      <td className="px-3 py-1.5">
                        <span className={`font-semibold ${
                          d.status.includes("importado") ? "text-green-700" :
                          d.status === "duplicado" ? "text-yellow-700" : "text-red-700"
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">{d.motivo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
