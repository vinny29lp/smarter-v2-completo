import { getVacancy } from "@/lib/actions/vacancies";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VagaActions } from "./VagaActions";

const statusBadge: Record<string,"green"|"yellow"|"gray"> = { ABERTA:"green",PAUSADA:"yellow",ENCERRADA:"gray" };
const discColor: Record<string,string> = {
  D:"bg-red-100 text-red-700",I:"bg-amber-100 text-amber-700",
  S:"bg-emerald-100 text-emerald-700",C:"bg-blue-100 text-blue-700"
};

export default async function VagaDetailPage({ params }: { params: { id: string } }) {
  const vaga = await getVacancy(params.id);
  if (!vaga) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/vagas" className="text-slate-400 hover:text-slate-600 text-sm">← Vagas</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{vaga.titulo}</h1>
        <Badge variant={statusBadge[vaga.status || "ABERTA"]}>{vaga.status}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ["Candidatos", vaga.applications.length],
          ["Bolsa", "R$ "+vaga.bolsa.toLocaleString("pt-BR")],
          ["C.H.", vaga.cargaHoraria+"h/sem"],
          ["Local", vaga.cidade && vaga.uf ? `${vaga.cidade}/${vaga.uf}` : "—"],
        ].map(([l,v])=>(
          <Card key={String(l)} className="p-4">
            <p className="text-xs text-slate-400">{l}</p>
            <p className="font-black text-sm mt-1">{v}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <Card className="p-5 col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Detalhes</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {[
              ["Empresa", vaga.company.name],
              ["Área", vaga.area||"—"],
              ["Modalidade", vaga.modalidade],
              ["Horário", vaga.horario||"—"],
              ["Benefícios", vaga.beneficios||"—"],
              ["DISC desejado", vaga.discDesejado||"Qualquer"],
            ].map(([l,v])=>(
              <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="font-semibold">{v}</p></div>
            ))}
          </div>
          {vaga.descricao && <><p className="text-xs font-bold text-slate-500 mb-1">Descrição</p><p className="text-sm text-slate-600 leading-relaxed mb-3">{vaga.descricao}</p></>}
          {vaga.requisitos && <><p className="text-xs font-bold text-slate-500 mb-1">Requisitos</p><p className="text-sm text-slate-600 leading-relaxed">{vaga.requisitos}</p></>}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Ações</h3>
          <VagaActions vagaId={vaga.id} status={vaga.status || "ABERTA"} publicSlug={vaga.publicSlug||undefined} titulo={vaga.titulo}/>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href={`/dashboard/processos?vagaId=${vaga.id}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors"
            >
              🎯 Processo Seletivo
              {vaga.applications.length > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{vaga.applications.length}</span>
              )}
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Candidatos ({vaga.applications.length})</h3>
        </div>
        {vaga.applications.length===0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum candidato ainda. Compartilhe o link da vaga!</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              {["Candidato","Curso","Instituição","DISC","Match","Etapa"].map(h=>(
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-4 py-2">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vaga.applications.map(a=>(
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold">{a.student.name}</p>
                    <p className="text-xs text-slate-400">{a.student.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{a.student.curso||"—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(a.student as any).institution?.name||"—"}</td>
                  <td className="px-4 py-3">
                    {a.student.discResult
                      ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${discColor[a.student.discResult]||"bg-slate-100"}`}>{a.student.discResult}</span>
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full bg-emerald-400" style={{width:`${a.matching||60}%`}}/>
                      </div>
                      <span className="text-xs font-bold">{a.matching||60}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.etapa==="aprovado"?"green":a.etapa==="reprovado"?"red":"blue"}>
                      {a.etapa}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
