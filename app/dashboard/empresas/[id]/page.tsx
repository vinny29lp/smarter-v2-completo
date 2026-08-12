import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompany } from "@/lib/actions/companies";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmpresaActions, EmpresaCPS, EmpresaProposta } from "./EmpresaActions";
import { SolicitacoesVaga } from "./SolicitacoesVaga";

const statusBadge: Record<string,"green"|"gray"|"yellow"|"red"> = { ATIVA:"green",INATIVA:"gray",ATENCAO:"yellow",PENDENTE:"yellow" };
const docStatusBadge: Record<string,"green"|"gray"|"yellow"|"blue"|"purple"|"red"> = { NAO_GERADO:"gray",GERADO:"purple",AGUARDANDO_ASSINATURA:"blue",ASSINADO:"green",CANCELADO:"red" };
const docStatusLabel: Record<string,string> = { NAO_GERADO:"Não Gerado",GERADO:"Gerado",AGUARDANDO_ASSINATURA:"Aguardando",ASSINADO:"Assinado ✓",CANCELADO:"Cancelado" };

export default async function EmpresaDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const empresa = await getCompany(params.id);
  if (!empresa) notFound();

  const contrAtivos = empresa.contracts.filter((c:any) => c.status === "ATIVO");
  const vagasAbertas = empresa.vacancies.filter((v:any) => v.status === "ABERTA");

  // Documentos enviados para assinatura (de todos os contratos da empresa)
  const docsAssinatura = empresa.contracts.flatMap((c:any) =>
    (c as any).documents?.filter((d:any) => ["AGUARDANDO_ASSINATURA","ASSINADO","ENVIADO_ASSINATURA"].includes(d.status)) || []
  );

  // Receita da empresa
  const receita = empresa.financials.filter((f:any) => f.tipo === "entrada" && f.status === "PAGO").reduce((a:number,b:any) => a+b.valor, 0);
  const pendente = empresa.financials.filter((f:any) => f.status === "PENDENTE").reduce((a:number,b:any) => a+b.valor, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/empresas" className="text-slate-400 hover:text-slate-600 text-sm">← Empresas</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{empresa.name}</h1>
        <Badge variant={statusBadge[empresa.status || "ATIVA"] || "gray"}>{empresa.status}</Badge>
        {empresa.pendente && <Badge variant="yellow">Pendente aprovação</Badge>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          ["Estagiários Ativos", contrAtivos.length],
          ["Vagas Abertas", vagasAbertas.length],
          ["Receita Recebida", "R$ "+receita.toLocaleString("pt-BR",{minimumFractionDigits:2})],
          ["A Receber", "R$ "+pendente.toLocaleString("pt-BR",{minimumFractionDigits:2})],
        ].map(([l,v]) => (
          <Card key={String(l)} className="p-4"><p className="text-xs text-slate-400">{l}</p><p className="font-black text-sm mt-1">{v}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* Dados Cadastrais */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Dados Cadastrais</h3>
          <div className="space-y-2 text-sm">
            {[
              ["CNPJ", empresa.cnpj],
              ["Setor", empresa.setor],
              ["Site", empresa.site],
              ["Endereço", empresa.endereco],
              ["Bairro", empresa.bairro],
              ["Cidade", `${empresa.cidade}/${empresa.uf}`],
              ["CEP", empresa.cep],
            ].filter(([,v]) => v).map(([l,v]) => (
              <div key={l}>
                <p className="text-xs text-slate-400">{l}</p>
                <p className="font-medium break-all">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Responsável e Contatos */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Responsável e Contatos</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Responsável", empresa.responsavel],
              ["Cargo", empresa.cargoResponsavel],
              ["E-mail", empresa.email],
              ["Telefone", empresa.telefone],
            ].filter(([,v]) => v).map(([l,v]) => (
              <div key={l}>
                <p className="text-xs text-slate-400">{l}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
            {empresa.telefone && (
              <a href={`https://wa.me/55${empresa.telefone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline mt-1">
                📱 WhatsApp
              </a>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-2">Franqueado Responsável</h4>
            <p className="text-sm">{empresa.franchise?.name || "—"}</p>
          </div>
        </Card>

        {/* Ações */}
        <EmpresaActions empresa={empresa} />
      </div>

      {/* Solicitações de Vaga */}
      <SolicitacoesVaga empresaId={empresa.id} />

      {/* Estagiários Ativos */}
      {contrAtivos.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Estagiários Ativos ({contrAtivos.length})</h3>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{["Nome","Bolsa","Início","Término","Ação"].map(h=>(
              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>))}</tr></thead>
            <tbody>
              {contrAtivos.map((c:any) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-semibold">{c.student.name}</td>
                  <td className="px-3 py-2 text-sm">R$ {c.bolsa.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{new Date(c.dataFim).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2"><Link href={`/dashboard/contratos/${c.id}`} className="text-xs text-blue-500 hover:underline">Ver docs →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Vagas */}
      {empresa.vacancies.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Vagas ({empresa.vacancies.length})</h3>
          <div className="space-y-2">
            {empresa.vacancies.map((v:any) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{v.titulo}</p>
                  <p className="text-xs text-slate-400">R$ {v.bolsa.toLocaleString("pt-BR")}/mês • {(v._count as any)?.applications || 0} candidatos</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={v.status === "ABERTA" ? "green" : "gray"}>{v.status}</Badge>
                  <Link href={`/dashboard/vagas/${v.id}`} className="text-xs text-blue-500 hover:underline">Ver →</Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Documentos para assinatura */}
      {docsAssinatura.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Documentos para Assinatura</h3>
          <div className="space-y-2">
            {docsAssinatura.map((d:any) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <p className="text-sm">{d.titulo}</p>
                <Badge variant={docStatusBadge[d.status] || "gray"}>{docStatusLabel[d.status] || d.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Proposta Comercial */}
      <EmpresaProposta empresa={empresa} />

      {/* Contrato de Prestação de Serviços */}
      <EmpresaCPS empresa={empresa} />

      {/* Financeiro */}
      {empresa.financials.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Financeiro</h3>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{["Descrição","Valor","Status","Data"].map(h=>(
              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>))}</tr></thead>
            <tbody>
              {empresa.financials.slice(0,10).map((f:any) => (
                <tr key={f.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2 text-sm">{f.descricao}</td>
                  <td className="px-3 py-2 text-sm font-medium">R$ {f.valor.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2"><Badge variant={f.status==="PAGO"?"green":f.status==="PENDENTE"?"yellow":"red"}>{f.status}</Badge></td>
                  <td className="px-3 py-2 text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Histórico CRM */}
      {empresa.crmLeads.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Histórico de Relacionamento</h3>
          <div className="space-y-2">
            {empresa.crmLeads.map((l:any) => (
              <div key={l.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{l.empresa}</p>
                  <Badge variant={l.etapa==="fechado"?"green":"blue"}>{l.etapa}</Badge>
                </div>
                {l.anotacao && <p className="text-xs text-slate-500 mt-1">{l.anotacao}</p>}
                {l.ultimoContato && <p className="text-xs text-slate-400">Último contato: {new Date(l.ultimoContato).toLocaleDateString("pt-BR")}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
