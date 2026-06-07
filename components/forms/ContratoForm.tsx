"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createContract } from "@/lib/actions/contracts";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AIButton } from "@/components/ai/AIButton";

interface Props { franchiseId: string; }

// ── Autocomplete genérico ─────────────────────────────────────────────────────
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

function Autocomplete({ label, placeholder, required, fetchUrl, resultKey, getLabel, onSelect, selectedLabel }: AutocompleteProps) {
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

// ── Formulário principal ──────────────────────────────────────────────────────
export function ContratoForm({ franchiseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [etapa, setEtapa] = useState(1);

  // Seleções de autocomplete (ID + label)
  const [selectedStudent, setSelectedStudent]   = useState<any>(null);
  const [selectedCompany,  setSelectedCompany]  = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);

  const [form, setForm] = useState({
    studentId: "", companyId: "", institutionId: "",
    tipoEstagio: "Nao Obrigatorio",
    bolsa: "", valorEmpresa: "", auxTransporte: "", beneficios: "Auxilio Transporte",
    dataInicio: "", dataFim: "", vencimento: "5",
    atividades: "", localEstagio: "", cidade: "", uf: "",
    chDiaria: "6", chSemanal: "30", diasSemana: "Segunda a Sexta",
    horarioInicio: "08:00", horarioFim: "14:00", intervalo: "60",
    supervisorNome: "", supervisorCargo: "", supervisorEmail: "", supervisorTel: "",
    coordNome: "", coordCargo: "", coordEmail: "", coordTel: "",
    apoliceSeguro: "212709/M-65358303000126", seguradora: "PORTO SEGURO S.A",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const chTotal = parseInt(form.chDiaria || "0") * (form.diasSemana.includes("Sábado") ? 6 : 5);

  // Payload para IA de atividades TCE
  const aiAtividadesPayload = {
    curso: selectedStudent?.curso || "",
    area: selectedStudent?.curso || "Ensino Superior",
    nivelEscolar: "",
    empresa: selectedCompany?.name || "",
    setor: selectedCompany?.setor || "",
    bolsa: form.bolsa,
    cargaHoraria: String(chTotal),
    chDiaria: form.chDiaria,
    diasSemana: form.diasSemana,
    tipoEstagio: form.tipoEstagio,
  };

  const handleSubmit = async () => {
    if (!form.studentId || !form.companyId || !form.bolsa || !form.dataInicio || !form.dataFim) {
      setError("Preencha: Estudante, Empresa, Bolsa e Datas."); return;
    }
    if (!form.supervisorNome) { setError("Informe o Supervisor da Empresa (obrigatório pela Lei 11.788/2008)."); return; }
    if (!form.apoliceSeguro) { setError("Informe a Apólice de Seguro (obrigatório pela Lei 11.788/2008)."); return; }
    setLoading(true); setError("");
    try {
      await createContract({
        ...form,
        franchiseId,
        bolsa: parseFloat(form.bolsa),
        valorEmpresa: form.valorEmpresa ? parseFloat(form.valorEmpresa) : null,
        auxTransporte: form.auxTransporte ? parseFloat(form.auxTransporte) : null,
        vencimento: parseInt(form.vencimento),
        dataInicio: new Date(form.dataInicio),
        dataFim: new Date(form.dataFim),
        chDiaria: parseInt(form.chDiaria),
        chSemanal: chTotal,
        intervalo: parseInt(form.intervalo),
        institutionId: form.institutionId || null,
      });
      router.push("/dashboard/contratos"); router.refresh();
    } catch (e: any) {
      const msg = e?.message || String(e) || "";
      setError(msg ? `Erro: ${msg}` : "Erro inesperado ao criar contrato. Tente novamente.");
    }
    setLoading(false);
  };

  const dias = Math.ceil((new Date(form.dataFim).getTime() - new Date(form.dataInicio).getTime()) / (1000 * 60 * 60 * 24));
  const anos = dias / 365;

  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-6">
        {["Partes", "Estágio", "Supervisor & Seguro"].map((l, i) => (
          <div key={i} className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${etapa === i + 1 ? "bg-[#0f2a5e] text-white" : etapa > i + 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}. {l}</div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {anos > 2 && form.dataFim && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">⚠️ O estágio ultrapassa 2 anos. Verifique exceção legal (PcD) — Lei 11.788/2008, art. 11.</div>
      )}

      {etapa === 1 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Partes do Contrato</h3>

          <Autocomplete
            label="Estagiário(a)"
            required
            placeholder="Digite nome, CPF ou e-mail (mín. 2 caracteres)..."
            fetchUrl={q => `/api/app/estudantes/buscar?q=${encodeURIComponent(q)}`}
            resultKey="estudantes"
            getLabel={s => `${s.name} — ${s.curso || "Sem curso"}`}
            selectedLabel={selectedStudent ? `${selectedStudent.name} — ${selectedStudent.curso || "Sem curso"}` : ""}
            onSelect={s => {
              setSelectedStudent(s);
              set("studentId", s?.id || "");
            }}
          />

          <Autocomplete
            label="Empresa Concedente"
            required
            placeholder="Digite nome, razão social ou CNPJ (mín. 2 caracteres)..."
            fetchUrl={q => `/api/app/empresas/buscar?q=${encodeURIComponent(q)}`}
            resultKey="empresas"
            getLabel={c => `${c.name} — ${c.cidade}/${c.uf}`}
            selectedLabel={selectedCompany ? `${selectedCompany.name} — ${selectedCompany.cidade}/${selectedCompany.uf}` : ""}
            onSelect={c => {
              setSelectedCompany(c);
              set("companyId", c?.id || "");
            }}
          />

          <Autocomplete
            label="Instituição de Ensino"
            placeholder="Digite o nome da instituição (mín. 2 caracteres)..."
            fetchUrl={q => `/api/app/instituicoes/buscar?q=${encodeURIComponent(q)}`}
            resultKey="instituicoes"
            getLabel={i => i.name}
            selectedLabel={selectedInstitution?.name || ""}
            onSelect={i => {
              setSelectedInstitution(i);
              set("institutionId", i?.id || "");
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">ℹ️ O número do contrato é gerado automaticamente pelo sistema.</div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de Estágio</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.tipoEstagio} onChange={e => set("tipoEstagio", e.target.value)}>
                <option value="Nao Obrigatorio">Não Obrigatório</option>
                <option value="Obrigatorio">Obrigatório</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {etapa === 2 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Dados do Estágio</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bolsa (R$) *" type="number" value={form.bolsa} onChange={e => set("bolsa", e.target.value)} placeholder="1500" />
            <Input label="Valor cobrado Empresa (R$)" type="number" value={form.valorEmpresa} onChange={e => set("valorEmpresa", e.target.value)} placeholder="1800" />
            <Input label="Auxílio Transporte (R$)" type="number" value={form.auxTransporte} onChange={e => set("auxTransporte", e.target.value)} placeholder="200" />
            <Input label="Benefícios" value={form.beneficios} onChange={e => set("beneficios", e.target.value)} placeholder="Auxílio Transporte" />
            <Input label="Data de Início *" type="date" value={form.dataInicio} onChange={e => set("dataInicio", e.target.value)} />
            <Input label="Data de Término *" type="date" value={form.dataFim} onChange={e => set("dataFim", e.target.value)} />
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">C.H. Diária (máx. 6h)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.chDiaria} onChange={e => set("chDiaria", e.target.value)}>
                {["4", "5", "6"].map(h => <option key={h} value={h}>{h}h/dia</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Dias da Semana</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.diasSemana} onChange={e => set("diasSemana", e.target.value)}>
                <option>Segunda a Sexta</option>
                <option>Segunda a Sábado</option>
              </select>
            </div>
            <Input label="Horário Início" type="time" value={form.horarioInicio} onChange={e => set("horarioInicio", e.target.value)} />
            <Input label="Horário Fim" type="time" value={form.horarioFim} onChange={e => set("horarioFim", e.target.value)} />
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Intervalo (minutos)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.intervalo} onChange={e => set("intervalo", e.target.value)}>
                <option value="0">Sem intervalo</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min (1h)</option>
              </select>
            </div>
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-bold">
              ⏱ Total: {chTotal}h/semana {chTotal > 30 && <span className="text-red-500">⚠️ Excede limite legal (30h)</span>}
            </div>
            <Input label="Vencimento (dia do mês)" type="number" value={form.vencimento} onChange={e => set("vencimento", e.target.value)} placeholder="5" />
            <Input label="Cidade do Estágio" value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="São Paulo" />
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Atividades do Estágio *</label>
                <AIButton
                  label="Gerar atividades conforme Lei 11.788/08"
                  endpoint="/api/app/ai/tce-atividades"
                  payload={aiAtividadesPayload}
                  resultLabel="Atividades geradas pela IA"
                  disabled={!form.studentId && !form.companyId}
                  onResult={(text) => set("atividades", text)}
                />
              </div>
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none" value={form.atividades} onChange={e => set("atividades", e.target.value)} placeholder="Descreva as atividades que o estagiário irá desenvolver..." />
            </div>
            <div className="col-span-2"><Input label="Local do Estágio" value={form.localEstagio} onChange={e => set("localEstagio", e.target.value)} placeholder="Av. Paulista, 1000 — São Paulo/SP" /></div>
          </div>
        </Card>
      )}

      {etapa === 3 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Supervisor & Seguro</h3>
          <p className="text-xs text-slate-400">Obrigatório pela Lei 11.788/2008</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Supervisor da Empresa *" value={form.supervisorNome} onChange={e => set("supervisorNome", e.target.value)} placeholder="Maria Santos" />
            <Input label="Cargo" value={form.supervisorCargo} onChange={e => set("supervisorCargo", e.target.value)} placeholder="Coordenadora de RH" />
            <Input label="E-mail do Supervisor" value={form.supervisorEmail} onChange={e => set("supervisorEmail", e.target.value)} placeholder="maria@empresa.com.br" />
            <Input label="Telefone do Supervisor" value={form.supervisorTel} onChange={e => set("supervisorTel", e.target.value)} placeholder="(11) 99999-2222" />
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600 mb-3">Coordenador da Instituição de Ensino</p>
            </div>
            <Input label="Nome do Orientador" value={form.coordNome} onChange={e => set("coordNome", e.target.value)} placeholder="Prof. Dr. Carlos Silva" />
            <Input label="Cargo" value={form.coordCargo} onChange={e => set("coordCargo", e.target.value)} placeholder="Coordenador de Estágios" />
            <Input label="E-mail" value={form.coordEmail} onChange={e => set("coordEmail", e.target.value)} placeholder="carlos@universidade.edu.br" />
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600 mb-3">Seguro de Vida Obrigatório</p>
            </div>
            <Input label="Apólice de Seguro *" value={form.apoliceSeguro} onChange={e => set("apoliceSeguro", e.target.value)} />
            <Input label="Seguradora" value={form.seguradora} onChange={e => set("seguradora", e.target.value)} />
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">✅ Após criar, os 11 documentos serão gerados automaticamente para este contrato.</div>
        </Card>
      )}

      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={() => etapa > 1 ? setEtapa(p => p - 1) : router.back()}>{etapa > 1 ? "← Voltar" : "Cancelar"}</Button>
        {etapa < 3
          ? <Button onClick={() => { setError(""); setEtapa(p => p + 1); }}>Próximo →</Button>
          : <Button onClick={handleSubmit} disabled={loading}>{loading ? "Criando..." : "Criar Contrato ✓"}</Button>
        }
      </div>
    </div>
  );
}
