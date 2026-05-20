import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const statusBadge: Record<string,"green"|"yellow"|"gray"|"red"> = {
  ATIVO:"green", PENDENTE:"yellow", AGUARDANDO_ASSINATURA:"yellow",
  FINALIZADO:"gray", INATIVO:"gray", SUSPENSO:"red",
};

export default async function EmpresaEstagiarios() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="text-slate-600 font-semibold">Empresa não vinculada à sua conta.</p>
      <p className="text-slate-400 text-sm mt-1">Entre em contato com seu consultor Smarter.</p>
    </div>
  );

  const contratos = await prisma.contract.findMany({
    where: { companyId },
    include: {
      student: {
        include: { institution: { select: { name: true } } },
      },
      documents: { select: { id: true, titulo: true, status: true, tipo: true } },
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Meus Estagiários</h1>

      {contratos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">👩‍💼</p>
          <p className="text-slate-600 font-semibold mb-3">Nenhum estagiário vinculado ainda.</p>
          <Link href="/portal-empresa/solicitar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3d8f] transition-colors">
            + Solicitar Estagiário
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {contratos.map(c => {
            const s = c.student;
            const docsAssinados = c.documents.filter(d => d.status === "ASSINADO").length;
            const docsAguardando = c.documents.filter(d => d.status === "AGUARDANDO_ASSINATURA").length;
            return (
              <Card key={c.id} className="p-6">
                {/* Cabeçalho */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{s.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {s.curso}{s.periodo ? ` — ${s.periodo}º período` : ""}
                      {s.institution ? ` • ${s.institution.name}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusBadge[c.status || "ATIVO"] || "gray"}>{c.status}</Badge>
                </div>

                {/* Grid de dados */}
                <div className="grid grid-cols-2 gap-5 mb-5">
                  {/* Dados pessoais */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dados Pessoais</p>
                    {[
                      ["CPF",      s.cpf],
                      ["E-mail",   s.email],
                      ["Celular",  s.celular],
                      ["Telefone", s.telefone],
                      ["Cidade",   s.cidade && s.uf ? `${s.cidade}/${s.uf}` : s.cidade],
                    ].filter(([,v]) => v).map(([l,v]) => (
                      <div key={l} className="flex items-center justify-between text-sm border-b border-slate-50 pb-1">
                        <span className="text-slate-400 text-xs">{l}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dados do contrato */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrato</p>
                    {[
                      ["Nº Contrato",  c.numero],
                      ["Bolsa",        `R$ ${c.bolsa.toLocaleString("pt-BR")}/mês`],
                      ["Início",       new Date(c.dataInicio).toLocaleDateString("pt-BR")],
                      ["Término",      new Date(c.dataFim).toLocaleDateString("pt-BR")],
                      ["Jornada",      `${c.chDiaria}h/dia · ${c.chSemanal}h/sem`],
                      ["Horário",      c.horarioInicio && c.horarioFim ? `${c.horarioInicio} – ${c.horarioFim}` : null],
                      ["Supervisor",   c.supervisorNome],
                    ].filter(([,v]) => v).map(([l,v]) => (
                      <div key={l} className="flex items-center justify-between text-sm border-b border-slate-50 pb-1">
                        <span className="text-slate-400 text-xs">{l}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Atividades */}
                {c.atividades && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Atividades</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.atividades}</p>
                  </div>
                )}

                {/* Documentos resumo */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>📄 {c.documents.length} documentos</span>
                    <span className="text-emerald-600">✓ {docsAssinados} assinados</span>
                    {docsAguardando > 0 && (
                      <span className="text-amber-600 font-bold">⏳ {docsAguardando} aguardando assinatura</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.celular && (
                      <a href={`https://wa.me/55${s.celular.replace(/\D/g,"")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-600 font-semibold hover:underline">
                        📱 WhatsApp
                      </a>
                    )}
                    {s.email && (
                      <a href={`mailto:${s.email}`}
                        className="text-xs text-blue-600 font-semibold hover:underline">
                        ✉️ E-mail
                      </a>
                    )}
                    <Link href={`/portal-empresa/avaliacoes?contrato=${c.id}`}
                      className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-xl font-semibold transition-colors">
                      📋 {c.evaluations.length > 0 ? "Ver Avaliação" : "Avaliar"}
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
