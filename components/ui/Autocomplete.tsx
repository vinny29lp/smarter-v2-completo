"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// Extraído de components/forms/ContratoForm.tsx (era um componente local não
// reaproveitável) para uso também na troca de estudante vinculado a um
// contrato já existente (app/dashboard/contratos/[id]/page.tsx).
interface AutocompleteProps {
  label: string;
  placeholder: string;
  required?: boolean;
  fetchUrl: (q: string) => string;
  resultKey: string;
  getLabel: (item: any) => string;
  onSelect: (item: any) => void;
  selectedLabel?: string;
}

export function Autocomplete({ label, placeholder, required, fetchUrl, resultKey, getLabel, onSelect, selectedLabel }: AutocompleteProps) {
  const [query, setQuery] = useState(selectedLabel || "");
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sincronizar label externo quando a seleção é limpa externamente
  useEffect(() => {
    if (!selectedLabel) setQuery("");
  }, [selectedLabel]);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setItems([]); setOpen(false); return; }
    setLoading(true);
    fetch(fetchUrl(q))
      .then(r => r.json())
      .then(data => {
        setItems(data[resultKey] || []);
        setOpen(true);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fetchUrl, resultKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (item: any) => {
    setQuery(getLabel(item));
    setItems([]);
    setOpen(false);
    onSelect(item);
  };

  const handleClear = () => {
    setQuery("");
    setItems([]);
    setOpen(false);
    onSelect(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs font-bold text-slate-600 block mb-1">{label}{required ? " *" : ""}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] pr-8"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (items.length > 0) setOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
            onClick={handleClear}
            tabIndex={-1}
          >×</button>
        )}
      </div>
      {loading && <p className="text-xs text-slate-400 mt-1">Buscando...</p>}
      {open && items.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border-2 border-slate-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {items.map((item, i) => (
            <li
              key={item.id || i}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0"
              onMouseDown={() => handleSelect(item)}
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
      {open && items.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 w-full bg-white border-2 border-slate-200 rounded-xl shadow-lg mt-1 px-3 py-2 text-sm text-slate-400">
          Nenhum resultado encontrado.
        </div>
      )}
    </div>
  );
}
