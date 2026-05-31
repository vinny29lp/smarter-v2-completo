"use client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Props {
  ativos: any[]; encerrados: any[];
  mes: number; ano: number; meses: string[];
  apolice: string; seguradora: string;
}

export function SegurosClient({ ativos, encerrados, mes, ano, meses, apolice, seguradora }: Props) {
  const router = useRouter();

  const downloadExcel = (tipo: "incluir" | "excluir") => {
    const lista = tipo === "incluir" ? ativos : encerrados;
    const rows = [
      ["Nome","CPF","Data Nascimento","Sexo","Data Inicio Estagio","Empresa","Franqueado"],
      ...lista.map(c => [
        c.student.name,
        c.student.cpf || "—",
        c.student.dataNasc ? new Date(c.student.dataNasc).toLocaleDateString("pt-BR") : "—",
        c.student.sexo === "F" ? "Feminino" : c.student.sexo === "M" ? "Masculino" : "—",
        new Date(c.dataInicio).toLocaleDateString("pt-BR"),
        c.company.name,
        c.franchise?.name || "—",
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seguro-${tipo}-${meses[mes-1].toLowerCase()}-${ano}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const changeMonth = (newMes: number, newAno: number) => {
    router.push(`?mes=${newMes}&ano=${newAno}`);
  };

  const prevMonth = () => {
    if (mes === 1) changeMonth(12, ano - 1);
    else changeMonth(mes - 1, ano);
  };
  const nextMonth = () => {
    if (mes === 12) changeMonth(1, ano + 1);
    else changeMonth(mes + 1, ano);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Seguros</h1>
          <p className="text-slate-500 text-sm mt-1">Apólice {apolice} • {seguradora} • Apenas Franqueadora</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors">←</button>
          <span className="text-sm font-bold px-3 py-2 bg-[#0f2a5e] text-white rounded-xl">
            {meses[mes-1]} / {ano}
          </span>
          <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors">→</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center border-l-4 border-emerald-400">
          <p className="text-xs text-slate-400">✅ Incluir no Seguro</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{ativos.length}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-red-400">
          <p className="text-xs text-slate-400">❌ Excluir do Seguro</p>
          <p className="text-3xl font-black text-red-600 mt-1">{encerrados.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-400">Referência</p>
          <p className="text-sm font-black text-[#0f2a5e] mt-1">{meses[mes-1]}/{ano}</p>
          <p className="text-[10px] text-slate-300 mt-1">Ciclo mensal — reinicia todo mês</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* INCLUIR */}
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">✅ Incluir no Seguro</p>
              <p className="text-xs text-slate-400">Estagiários ativos em {meses[mes-1]}/{ano}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={()=>downloadExcel("incluir")}>
              ⬇ Excel
            </Button>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100">
                {["Nome","CPF","Data Nasc.","Sexo","Empresa"].map(h=>(
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ativos.length===0
                  ?<tr><td colSpan={5} className="text-center py-6 text-slate-400">Nenhum estagiário ativo neste mês.</td></tr>
                  :ativos.map(c=>(
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold">{c.student.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{c.student.cpf||"—"}</td>
                    <td className="px-3 py-2 text-slate-500">{c.student.dataNasc?new Date(c.student.dataNasc).toLocaleDateString("pt-BR"):"—"}</td>
                    <td className="px-3 py-2">{c.student.sexo==="F"?"F":"M"}</td>
                    <td className="px-3 py-2 text-slate-500">{c.company.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* EXCLUIR */}
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">❌ Excluir do Seguro</p>
              <p className="text-xs text-slate-400">Contratos encerrados em {meses[mes-1]}/{ano}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={()=>downloadExcel("excluir")}>
              ⬇ Excel
            </Button>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100">
                {["Nome","CPF","Empresa","Status"].map(h=>(
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {encerrados.length===0
                  ?<tr><td colSpan={4} className="text-center py-6 text-slate-400">Nenhum encerramento neste mês.</td></tr>
                  :encerrados.map(c=>(
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold">{c.student.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{c.student.cpf||"—"}</td>
                    <td className="px-3 py-2 text-slate-500">{c.company.name}</td>
                    <td className="px-3 py-2"><Badge variant="red">{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
