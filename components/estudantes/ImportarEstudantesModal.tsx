"use client";
import { useState, useRef, useCallback } from "react";

// Mapeamento de nomes de colunas → campos internos
const COL_MAP: Record<string, string> = {
  nome: "nome", name: "nome", "nome completo": "nome", "aluno": "nome",
  cpf: "cpf",
  email: "email", "e-mail": "email",
  telefone: "telefone", celular: "celular", phone: "telefone", fone: "telefone",
  "data de nascimento": "dataNasc", "data nascimento": "dataNasc", nascimento: "dataNasc",
  "data_nasc": "dataNasc", "dt_nasc": "dataNasc", "datanasc": "dataNasc",
  curso: "curso", course: "curso", "graduação": "curso", graduacao: "curso",
  cep: "cep",
  "endereço": "endereco", endereco: "endereco", address: "endereco", logradouro: "endereco",
  bairro: "bairro", neighborhood: "bairro",
  cidade: "cidade", city: "cidade", municipio: "cidade",
  uf: "uf", estado: "uf", state: "uf",
};

function normalizeKey(k: string) {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function mapRow(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    const key = COL_MAP[normalizeKey(h)];
    if (key) row[key] = (values[i] || "").trim();
  });
  return row;
}

async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve((window as any).XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, "").trim()));
  return { headers, rows };
}

interface ParsedStudent {
  nome: string;
  cpf?: string;
  email: string;
  telefone?: string;
  celular?: string;
  dataNasc?: string;
  curso?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  _valido: boolean;
  _motivo?: string;
}

function validateRow(row: Record<string, string>): { valido: boolean; motivo?: string } {
  if (!row.nome) return { valido: false, motivo: "Nome obrigatório" };
  if (!row.email) return { valido: false, motivo: "E-mail obrigatório" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return { valido: false, motivo: "E-mail inválido" };
  return { valido: true };
}

type Step = "upload" | "preview" | "importing" | "result";

interface ImportResult {
  importados: number;
  duplicados: number;
  erros: number;
  detalhes: { nome: string; email: string; status: "importado" | "duplicado" | "erro"; motivo?: string }[];
}

export function ImportarEstudantesModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [students, setStudents] = useState<ParsedStudent[]>([]);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = students.filter(s => s._valido).length;
  const invalidCount = students.filter(s => !s._valido).length;

  const processFile = async (file: File) => {
    setParseError("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    setFileName(file.name);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (ext === "csv") {
        const text = await file.text();
        const parsed = parseCSV(text);
        headers = parsed.headers;
        rows = parsed.rows;
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await loadXLSX();
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if (data.length < 2) { setParseError("Arquivo vazio ou sem dados."); return; }
        headers = data[0].map((h: any) => String(h || ""));
        rows = data.slice(1).map((r: any[]) => headers.map((_, i) => String(r[i] ?? "")));
      } else {
        setParseError("Formato não suportado. Use XLSX, XLS ou CSV.");
        return;
      }

      if (headers.length === 0) { setParseError("Não foi possível ler os cabeçalhos."); return; }

      const parsed: ParsedStudent[] = rows
        .filter(r => r.some(c => c.trim()))
        .map(r => {
          const mapped = mapRow(headers, r);
          const { valido, motivo } = validateRow(mapped);
          return {
            nome: mapped.nome || "",
            cpf: mapped.cpf,
            email: mapped.email || "",
            telefone: mapped.telefone,
            celular: mapped.celular,
            dataNasc: mapped.dataNasc,
            curso: mapped.curso,
            cep: mapped.cep,
            endereco: mapped.endereco,
            bairro: mapped.bairro,
            cidade: mapped.cidade,
            uf: mapped.uf,
            _valido: valido,
            _motivo: motivo,
          };
        });

      if (parsed.length === 0) { setParseError("Nenhum registro encontrado no arquivo."); return; }

      setStudents(parsed);
      setStep("preview");
    } catch (e: any) {
      setParseError("Erro ao ler arquivo: " + (e.message || ""));
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const confirmarImportacao = async () => {
    const validos = students.filter(s => s._valido);
    if (validos.length === 0) return;
    setStep("importing");
    setProgress(0);

    // Enviar em lotes de 20
    const BATCH = 20;
    const batches: ParsedStudent[][] = [];
    for (let i = 0; i < validos.length; i += BATCH) batches.push(validos.slice(i, i + BATCH));

    const allDetails: ImportResult["detalhes"] = [];
    let totalImportados = 0, totalDuplicados = 0, totalErros = 0;

    for (let i = 0; i < batches.length; i++) {
      const res = await fetch("/api/app/estudantes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudantes: batches[i], arquivo: fileName }),
      });
      const data = await res.json();
      totalImportados += data.importados || 0;
      totalDuplicados += data.duplicados || 0;
      totalErros += data.erros || 0;
      allDetails.push(...(data.detalhes || []));
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }

    setResult({ importados: totalImportados, duplicados: totalDuplicados, erros: totalErros, detalhes: allDetails });
    setStep("result");
    if (onSuccess) onSuccess();
  };

  const downloadRelatorio = () => {
    if (!result) return;
    const lines = [
      "Nome,E-mail,Status,Motivo",
      ...result.detalhes.map(d => `"${d.nome}","${d.email}","${d.status}","${d.motivo || ""}"`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-importacao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-800">📥 Importar Estudantes</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === "upload" && "Selecione um arquivo XLSX, XLS ou CSV"}
              {step === "preview" && `${students.length} registros encontrados — ${validCount} válidos, ${invalidCount} com erro`}
              {step === "importing" && "Importando..."}
              {step === "result" && "Importação concluída"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP: UPLOAD */}
          {step === "upload" && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-[#0f2a5e] bg-blue-50" : "border-slate-200 hover:border-[#0f2a5e] hover:bg-slate-50"}`}
              >
                <div className="text-5xl mb-3">📂</div>
                <p className="font-bold text-slate-700">Arraste o arquivo aqui ou clique para selecionar</p>
                <p className="text-sm text-slate-400 mt-1">Aceita: <strong>XLSX</strong>, <strong>XLS</strong>, <strong>CSV</strong></p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
              {parseError && <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-xl">{parseError}</p>}

              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-2">COLUNAS RECONHECIDAS (qualquer ordem):</p>
                <p className="text-xs text-slate-400">Nome, CPF, Email, Telefone, Data de Nascimento, Curso, CEP, Endereço, Bairro, Cidade, UF</p>
              </div>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === "preview" && (
            <div>
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-black text-blue-700">{students.length}</p>
                  <p className="text-xs text-blue-500 font-semibold">Total</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-black text-emerald-700">{validCount}</p>
                  <p className="text-xs text-emerald-500 font-semibold">Válidos</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-black text-red-700">{invalidCount}</p>
                  <p className="text-xs text-red-500 font-semibold">Com erro</p>
                </div>
              </div>

              {/* Tabela preview */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Nome</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">E-mail</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">CPF</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Curso</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={i} className={`border-t border-slate-50 ${s._valido ? "" : "bg-red-50/50"}`}>
                          <td className="px-3 py-2">{s.nome || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{s.email || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{s.cpf || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{s.curso || "—"}</td>
                          <td className="px-3 py-2">
                            {s._valido
                              ? <span className="text-emerald-600 font-semibold">✓ OK</span>
                              : <span className="text-red-600 font-semibold" title={s._motivo}>⚠ {s._motivo}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {invalidCount > 0 && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠ Os {invalidCount} registros com erro serão ignorados. Apenas os {validCount} válidos serão importados.
                </p>
              )}
            </div>
          )}

          {/* STEP: IMPORTING */}
          {step === "importing" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">⏳</div>
              <p className="font-bold text-slate-700 mb-3">Importando estudantes...</p>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                <div className="bg-[#0f2a5e] h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-slate-400">{progress}%</p>
            </div>
          )}

          {/* STEP: RESULT */}
          {step === "result" && result && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-3xl font-black text-emerald-700">{result.importados}</p>
                  <p className="text-xs text-emerald-500 font-bold mt-1">Importados</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-3xl font-black text-amber-700">{result.duplicados}</p>
                  <p className="text-xs text-amber-500 font-bold mt-1">Duplicados</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-3xl font-black text-red-700">{result.erros}</p>
                  <p className="text-xs text-red-500 font-bold mt-1">Erros</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
                <div className="overflow-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Nome</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">E-mail</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Status</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Obs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.detalhes.map((d, i) => (
                        <tr key={i} className="border-t border-slate-50">
                          <td className="px-3 py-2">{d.nome}</td>
                          <td className="px-3 py-2 text-slate-400">{d.email}</td>
                          <td className="px-3 py-2">
                            {d.status === "importado" && <span className="text-emerald-600 font-bold">✓ Importado</span>}
                            {d.status === "duplicado" && <span className="text-amber-600 font-bold">⊘ Duplicado</span>}
                            {d.status === "erro" && <span className="text-red-600 font-bold">✕ Erro</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-400">{d.motivo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={downloadRelatorio}
                className="w-full py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ⬇ Baixar Relatório CSV
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
          {step === "upload" && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancelar</button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("upload"); setStudents([]); }} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">← Voltar</button>
              <button
                onClick={confirmarImportacao}
                disabled={validCount === 0}
                className="px-6 py-2 bg-[#0f2a5e] text-white text-sm font-bold rounded-xl hover:bg-[#1a3d8f] transition-colors disabled:opacity-40"
              >
                Importar {validCount} estudantes →
              </button>
            </>
          )}
          {step === "result" && (
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2 bg-[#0f2a5e] text-white text-sm font-bold rounded-xl hover:bg-[#1a3d8f] transition-colors"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
