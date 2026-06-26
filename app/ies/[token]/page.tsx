"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import MinutaConvenio from "@/components/ies/MinutaConvenio";

type Etapa = "landing" | "documentos" | "minuta" | "assinatura" | "concluido";

export default function IESPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("landing");
  const [minutaLida, setMinutaLida] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", confirmaLeitura: false, confirmaAutoridade: false });
  const [minutaPropria, setMinutaPropria] = useState(false);
  const [observacaoMinuta, setObservacaoMinuta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const minutaRef = useRef<HTMLDivElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/ies/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); setLoading(false); return; }
        setData(d);
        setLoading(false);
        if (d.institution?.convenioStatus === "FIRMADO" || d.institution?.convenioStatus === "AGUARDANDO_MINUTA") setEtapa("concluido");
      })
      .catch(() => { setErro("Não foi possível carregar o portal. Tente novamente."); setLoading(false); });
  }, [token]);

  useEffect(() => { topoRef.current?.scrollIntoView({ behavior: "smooth" }); }, [etapa]);

  const assinar = async () => {
    if (!form.nome || !form.cpf || !form.email) return;
    if (!minutaPropria && (!form.confirmaLeitura || !form.confirmaAutoridade)) return;
    setEnviando(true);
    const r = await fetch(`/api/ies/${token}/assinar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assinanteName: form.nome,
        assinanteCpf: form.cpf,
        assinanteEmail: form.email,
        confirmaLeitura: form.confirmaLeitura,
        confirmaAutoridade: form.confirmaAutoridade,
        minutaPropria,
        observacao: observacaoMinuta,
      }),
    });
    const d = await r.json();
    setEnviando(false);
    if (d.error) { setErro(d.error); return; }
    setResultado(d);
    setEtapa("concluido");
  };

  const formatarCPF = (v: string) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);

  if (loading) return (
    <div className="min-h-screen bg-[#0f2a5e] flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm opacity-70">Carregando portal...</p>
      </div>
    </div>
  );

  if (erro && !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm">{erro}</p>
        <p className="text-gray-400 text-xs mt-4">Se você acredita que este link é válido, entre em contato com a equipe Smarter Estágios que te enviou este convite.</p>
      </div>
    </div>
  );

  const ies = data?.institution || {};
  const config = data?.config || {};
  const documentos = data?.documentos || [];
  const smarter = config;

  // ──────────────────────────────────────────────────────────────────────────────
  // ETAPA: CONCLUÍDO
  // ──────────────────────────────────────────────────────────────────────────────
  const isMinutaPropria = resultado?.minutaPropria || ies.convenioStatus === "AGUARDANDO_MINUTA";

  if (etapa === "concluido") return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isMinutaPropria ? "bg-gradient-to-br from-amber-50 to-yellow-100" : "bg-gradient-to-br from-emerald-50 to-green-100"}`}>
      <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isMinutaPropria ? "bg-amber-100" : "bg-green-100"}`}>
          {isMinutaPropria
            ? <span className="text-4xl">📨</span>
            : <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          }
        </div>
        {isMinutaPropria ? (
          <>
            <h1 className="text-2xl font-black text-gray-800 mb-2">Solicitação recebida! 📋</h1>
            <p className="text-gray-500 mb-6">
              Nossa equipe de convênios recebeu sua solicitação e entrará em contato em breve para tratar a minuta da <strong>{ies.name}</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-amber-600 font-bold mb-2">⏳ PRÓXIMOS PASSOS</p>
              <div className="space-y-1.5 text-sm text-amber-800">
                <p>📩 E-mail enviado para convenios@smarterestagios.com.br</p>
                <p>📞 Consultor entrará em contato em até 2 dias úteis</p>
                <p>📄 Você nos enviará a minuta da sua instituição</p>
                <p>✅ Assinatura presencial ou por Autentique</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-800 mb-2">Convênio Firmado! 🎉</h1>
            <p className="text-gray-500 mb-6">
              <strong>{ies.name}</strong> agora faz parte da rede Smarter Estágios. Um e-mail de confirmação com o protocolo foi enviado para você.
            </p>
            {resultado?.protocolo && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-xs text-gray-400 font-bold mb-1">PROTOCOLO DE ASSINATURA</p>
                <p className="font-mono text-sm font-bold text-gray-700">{resultado.protocolo}</p>
                <p className="text-xs text-gray-400 mt-1">Guarde este código como comprovante da assinatura eletrônica.</p>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
              <p className="text-xs text-blue-700 font-bold mb-2">🎓 Acompanhe seus alunos em estágio</p>
              <p className="text-xs text-blue-600 mb-2">Use o link abaixo a qualquer momento para acompanhar os estágios dos alunos da sua instituição:</p>
              <p className="text-xs font-mono text-blue-800 break-all">{typeof window !== "undefined" ? window.location.href : ""}</p>
            </div>
            <div className="bg-[#0f2a5e] rounded-2xl p-5 text-white text-left">
              <p className="font-bold text-sm mb-3">Próximos passos:</p>
              <div className="space-y-2 text-sm opacity-90">
                <p>✅ Convênio registrado e protocolo gerado</p>
                <p>📞 Consultor Smarter entra em contato</p>
                <p>📝 Primeiro TCE pode ser emitido</p>
                <p>🎓 Estudantes começam a ser encaminhados</p>
              </div>
            </div>
          </>
        )}
        <p className="text-xs text-gray-400 mt-6">
          Dúvidas? Entre em contato: <a href={`mailto:${smarter.email || "contato@smarterestagios.com.br"}`} className="text-[#0f2a5e] font-semibold">{smarter.email || "contato@smarterestagios.com.br"}</a>
        </p>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // BARRA DE PROGRESSO GLOBAL
  // ──────────────────────────────────────────────────────────────────────────────
  const etapas: Etapa[] = ["landing", "documentos", "minuta", "assinatura"];
  const etapaIdx = etapas.indexOf(etapa);
  const progresso = Math.round(((etapaIdx) / (etapas.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-gray-50" ref={topoRef}>
      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-[#0f2a5e] to-[#1e4a8f] text-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logoDocUrl ? (
              <img src={config.logoDocUrl} alt="Smarter" className="h-9 object-contain brightness-0 invert" />
            ) : (
              <div className="bg-white/20 rounded-xl px-3 py-1 font-black text-lg tracking-wide">S</div>
            )}
            <div>
              <p className="font-black text-sm">{config.nomeFantasia || "Smarter Estágios"}</p>
              <p className="text-[10px] opacity-60">Portal de Adesão IES</p>
            </div>
          </div>
          {etapa !== "landing" && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {["Apresentação","Documentos","Convênio","Assinatura"].map((label, i) => (
                <div key={i} className={`flex items-center gap-1.5 ${i <= etapaIdx ? "opacity-100" : "opacity-40"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < etapaIdx ? "bg-emerald-400" : i === etapaIdx ? "bg-white text-[#0f2a5e]" : "bg-white/30"}`}>
                    {i < etapaIdx ? "✓" : i + 1}
                  </div>
                  <span>{label}</span>
                  {i < 3 && <span className="opacity-30 ml-1">›</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {etapa !== "landing" && (
          <div className="h-1 bg-white/10">
            <div className="h-1 bg-emerald-400 transition-all duration-700" style={{ width: `${progresso}%` }} />
          </div>
        )}
      </div>

      {/* ──────────── ETAPA 1: LANDING ──────────── */}
      {etapa === "landing" && (
        <div>
          {/* Hero */}
          <div className="bg-gradient-to-br from-[#0f2a5e] via-[#1a3d7a] to-[#0f2a5e] text-white pb-16 pt-8">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-white/20">
                🎓 Convite exclusivo para {ies.name}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
                Transforme a experiência<br/>dos seus alunos no mercado de trabalho
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
                A <strong className="text-white">Smarter Estágios</strong> convida a sua instituição a fazer parte de uma rede que já conecta
                centenas de estudantes a oportunidades reais — com gestão completa e 100% digital.
              </p>
              <button
                onClick={() => setEtapa("documentos")}
                className="bg-[#f5c400] hover:bg-yellow-300 text-[#0f2a5e] font-black px-10 py-4 rounded-2xl text-base transition-all hover:scale-105 shadow-xl">
                Conhecer e firmar convênio →
              </button>
              <p className="text-white/40 text-xs mt-4">Processo 100% digital • Sem custos para a IES • Leva menos de 5 minutos</p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#f5c400] py-6">
            <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
              {[["📄","Estágios gerenciados","digitalmente"],["⚡","Documentação","100% online"],["🔒","Segurança e conformidade","LGPD"]].map(([icon, t, s]) => (
                <div key={t}>
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="font-black text-[#0f2a5e] text-sm">{t}</p>
                  <p className="text-[#0f2a5e]/60 text-xs">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* O que a IES ganha */}
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">BENEFÍCIOS PARA A INSTITUIÇÃO</span>
              <h2 className="text-2xl font-black text-gray-800 mt-4">Tudo que a sua instituição precisa para gerir estágios com excelência</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                ["📊","Painel em tempo real","Acompanhe todos os estágios dos seus alunos em andamento, com acesso a relatórios, avaliações e documentos — tudo em um só lugar."],
                ["📝","TCE digital automatizado","Contratos de estágio gerados e assinados eletronicamente. Sem papel, sem burocracia, sem deslocamento."],
                ["🎯","Seleção qualificada","Nosso sistema faz o match entre o perfil do aluno e as vagas disponíveis, aumentando a compatibilidade e a permanência no estágio."],
                ["📬","Comunicação integrada","Notificações automáticas para alunos, professores orientadores e supervisores mantêm todos alinhados durante todo o estágio."],
                ["📋","Relatórios e avaliações","Relatórios semestrais de acompanhamento com assinatura digital do supervisor e do orientador, tudo no sistema."],
                ["🔐","Total conformidade legal","Todos os processos seguem rigorosamente a Lei n.º 11.788/2008, com trilha de auditoria completa para cada estágio."],
              ].map(([icon, titulo, desc]) => (
                <div key={titulo as string} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
                  <div className="text-3xl flex-shrink-0">{icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">{titulo}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* O que o aluno ganha */}
          <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1e4a8f] text-white py-16">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10">
                <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs font-bold border border-white/20">BENEFÍCIOS PARA OS ALUNOS</span>
                <h2 className="text-2xl font-black mt-4">Seus alunos em outro nível profissional</h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  ["🎓","Perfil profissional completo","DISC, currículo digital, portfólio e histórico de estágio — tudo em uma plataforma pensada para alavancar a carreira."],
                  ["💼","Vagas qualificadas","Acesso a oportunidades em empresas parceiras da rede Smarter, com matching automático por área, curso e perfil comportamental."],
                  ["📱","Acompanhamento total","O aluno acompanha todo o estágio pelo sistema: documentos, bolsa, frequência, avaliações e muito mais."],
                ].map(([icon, titulo, desc]) => (
                  <div key={titulo as string} className="bg-white/10 rounded-2xl p-5 border border-white/10">
                    <p className="text-3xl mb-3">{icon}</p>
                    <h3 className="font-bold mb-2">{titulo}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Como funciona — passo a passo */}
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">PROCESSO DE CONVÊNIO</span>
              <h2 className="text-2xl font-black text-gray-800 mt-4">Como funciona em 4 passos simples</h2>
            </div>
            <div className="space-y-5">
              {[
                ["1","Assinatura digital da minuta","Sua instituição assina eletronicamente o Convênio de Estágio com a Smarter. Processo 100% online, sem cartório.","⏱ ~5 min"],
                ["2","Cadastro no sistema","Seus alunos e professores orientadores são cadastrados na plataforma. A Smarter cuida de tudo.","📅 1 dia útil"],
                ["3","Primeiros candidatos encaminhados","Nossa equipe já começa a encaminhar alunos para vagas compatíveis com os cursos da sua IES.","🚀 Imediato"],
                ["4","Acompanhamento contínuo","TCEs gerados, assinados e acompanhados digitalmente. Relatórios disponíveis 24h. Zero papel.","🔄 Contínuo"],
              ].map(([num, titulo, desc, tempo]) => (
                <div key={num as string} className="flex gap-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 bg-[#0f2a5e] text-white rounded-full flex items-center justify-center font-black text-base flex-shrink-0">{num}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-gray-800">{titulo}</h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{tempo}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sistema showcase */}
          <div className="bg-gray-100 py-16">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">PLATAFORMA SMARTER</span>
                <h2 className="text-2xl font-black text-gray-800 mt-4">Um sistema completo para cada parte envolvida</h2>
                <p className="text-gray-500 mt-2 text-sm">Do primeiro contato ao certificado de conclusão — tudo em um único ecossistema digital</p>
              </div>
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  ["🏛️","Franqueado / Smarter","Gerencia vagas, contratos, empresas, estudantes, financeiro e documentos em tempo real"],
                  ["🏢","Empresa Contratante","Solicita vagas, acompanha candidatos, assina documentos e avalia estagiários"],
                  ["🎓","Estudante","Acessa oportunidades, faz DISC, mantém currículo atualizado e acompanha o estágio"],
                  ["📚","Instituição de Ensino","Visualiza estágios, avalia relatórios e coordena com os orientadores"],
                ].map(([icon, titulo, desc]) => (
                  <div key={titulo as string} className="bg-white rounded-2xl p-5 shadow-sm text-center">
                    <p className="text-3xl mb-3">{icon}</p>
                    <h3 className="font-bold text-gray-800 text-sm mb-2">{titulo}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="bg-gradient-to-r from-[#0f2a5e] to-[#1e4a8f] py-16 text-white text-center">
            <div className="max-w-2xl mx-auto px-6">
              <h2 className="text-2xl font-black mb-4">Pronto para conectar seus alunos às melhores oportunidades?</h2>
              <p className="text-white/70 mb-8">A adesão é gratuita para a IES e o processo leva menos de 5 minutos. Comece agora.</p>
              <button
                onClick={() => setEtapa("documentos")}
                className="bg-[#f5c400] hover:bg-yellow-300 text-[#0f2a5e] font-black px-10 py-4 rounded-2xl text-base transition-all hover:scale-105 shadow-xl">
                Iniciar adesão ao convênio →
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-900 text-white/50 text-xs text-center py-6 px-4">
            <p>{config.razaoSocial || "Smarter Estágios Agente de Integração Ltda."} • CNPJ: {config.cnpj || ""}</p>
            <p className="mt-1">{config.endereco || ""} • {config.cidade || ""}/{config.uf || ""}</p>
          </div>
        </div>
      )}

      {/* ──────────── ETAPA 2: DOCUMENTOS DA SMARTER ──────────── */}
      {etapa === "documentos" && (
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📁</div>
            <h2 className="text-2xl font-black text-gray-800">Documentos da Smarter Estágios</h2>
            <p className="text-gray-500 mt-2 text-sm">Aqui estão os documentos institucionais da Smarter que sua IES pode precisar para registros internos ou processos de compliance.</p>
          </div>

          {documentos.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
              <p className="text-blue-600 text-sm">Os documentos institucionais da Smarter serão disponibilizados em breve. Prossiga para a leitura da minuta de convênio.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {documentos.map((doc: any) => {
                const icons: Record<string, string> = { CNPJ: "🏢", CPF: "👤", CERTIDAO: "📜", CONTRATO_SOCIAL: "📋", OUTRO: "📎" };
                return (
                  <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icons[doc.tipo] || "📎"}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{doc.nome}</p>
                        {doc.tamanho && <p className="text-xs text-gray-400">{(doc.tamanho / 1024).toFixed(0)} KB</p>}
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="bg-[#0f2a5e] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1e4a8f] transition-colors">
                      Baixar
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-8">
            <strong>ℹ️ Nota:</strong> Os documentos acima são fornecidos pela Smarter Estágios para fins de transparência institucional. Novos documentos (como certidões renovadas) serão atualizados periodicamente neste mesmo portal.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEtapa("landing")} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              ← Voltar
            </button>
            <button onClick={() => setEtapa("minuta")} className="flex-2 flex-grow bg-[#0f2a5e] text-white font-bold py-3 px-8 rounded-2xl hover:bg-[#1e4a8f] transition-colors">
              Ler minuta de convênio →
            </button>
          </div>
        </div>
      )}

      {/* ──────────── ETAPA 3: MINUTA ──────────── */}
      {etapa === "minuta" && (
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📄</div>
            <h2 className="text-2xl font-black text-gray-800">Minuta de Convênio de Estágio</h2>
            <p className="text-gray-500 mt-2 text-sm">Leia atentamente o convênio abaixo. Ao concluir a leitura, você poderá prosseguir para a assinatura eletrônica.</p>
          </div>

          <div
            ref={minutaRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const chegouFim = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
              if (chegouFim) setMinutaLida(true);
            }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-h-[70vh] overflow-y-auto mb-4">
            <MinutaConvenio
              ies={{
                name: ies.name,
                razaoSocial: ies.razaoSocial,
                cnpj: ies.cnpj,
                endereco: ies.endereco,
                cidade: ies.cidade,
                uf: ies.uf,
                coordenador: ies.coordenador,
                cargoCoord: ies.cargoCoord,
                email: ies.email,
              }}
              smarter={{
                razaoSocial: smarter.razaoSocial,
                cnpj: smarter.cnpj,
                endereco: smarter.endereco,
                cidade: smarter.cidade,
                uf: smarter.uf,
                responsavel: smarter.responsavel,
                email: smarter.email,
                telefone: smarter.telefone,
              }}
              modo="visualizacao"
            />
          </div>

          {!minutaLida && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">↓</div>
              <p className="text-amber-800 text-xs">Role até o final do documento para habilitar a assinatura.</p>
            </div>
          )}
          {minutaLida && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">✓</div>
              <p className="text-emerald-800 text-xs font-semibold">Leitura concluída! Você já pode prosseguir para a assinatura.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setEtapa("documentos")} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              ← Voltar
            </button>
            <button
              disabled={!minutaLida}
              onClick={() => setEtapa("assinatura")}
              className="flex-grow bg-[#0f2a5e] text-white font-bold py-3 px-8 rounded-2xl hover:bg-[#1e4a8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Assinar eletronicamente →
            </button>
          </div>
        </div>
      )}

      {/* ──────────── ETAPA 4: ASSINATURA ──────────── */}
      {etapa === "assinatura" && (
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✍️</div>
            <h2 className="text-2xl font-black text-gray-800">Assinatura do Convênio</h2>
            <p className="text-gray-500 mt-2 text-sm">Preencha os dados do representante legal autorizado a assinar pela {ies.name}.</p>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">❌ {erro}</div>}

          {/* Seleção: Minuta Smarter ou Minuta Própria */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Qual minuta deseja utilizar?</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!minutaPropria ? "border-[#0f2a5e] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" checked={!minutaPropria} onChange={() => setMinutaPropria(false)} className="mt-0.5 accent-[#0f2a5e]"/>
                <div>
                  <p className="font-bold text-sm text-gray-800">Minuta Smarter</p>
                  <p className="text-xs text-gray-500 mt-0.5">Use a minuta padrão da Smarter Estágios — processo 100% digital, válida juridicamente.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${minutaPropria ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" checked={minutaPropria} onChange={() => setMinutaPropria(true)} className="mt-0.5 accent-amber-500"/>
                <div>
                  <p className="font-bold text-sm text-gray-800">Minuta da Instituição</p>
                  <p className="text-xs text-gray-500 mt-0.5">Prefiro usar a minuta padrão da nossa instituição. Nossa equipe entrará em contato.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Nome Completo do Representante *</label>
              <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome conforme documento oficial"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e] transition-colors"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">CPF *</label>
                <input type="text" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatarCPF(e.target.value) }))}
                  placeholder="000.000.000-00" maxLength={14}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e] transition-colors"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">E-mail Institucional *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="coordenador@instituicao.edu.br"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e] transition-colors"/>
              </div>
            </div>

            {/* Campos específicos por tipo */}
            {!minutaPropria ? (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.confirmaLeitura} onChange={e => setForm(p => ({ ...p, confirmaLeitura: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#0f2a5e] flex-shrink-0"/>
                  <span className="text-sm text-gray-700">
                    Declaro que li e compreendi integralmente o <strong>Convênio de Estágio</strong> e concordo com todos os seus termos e condições.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.confirmaAutoridade} onChange={e => setForm(p => ({ ...p, confirmaAutoridade: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#0f2a5e] flex-shrink-0"/>
                  <span className="text-sm text-gray-700">
                    Declaro que sou <strong>representante legal</strong> ou possuo poderes delegados para assinar este instrumento em nome de <strong>{ies.name}</strong>, responsabilizando-me civil e juridicamente por esta declaração.
                  </span>
                </label>
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                  🔒 Assinatura registrada com data, hora e IP nos termos do art. 10, §2.º da MP n.º 2.200-2/2001 e da Lei n.º 14.063/2020.
                </div>
              </div>
            ) : (
              <div className="border-t border-amber-100 pt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800">
                  ℹ️ Ao confirmar, nossa equipe de convênios receberá sua solicitação e entrará em contato para tratar a minuta da sua instituição. O envio de e-mail para <strong>convenios@smarterestagios.com.br</strong> será automático.
                </div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">Observações (opcional)</label>
                <textarea value={observacaoMinuta} onChange={e => setObservacaoMinuta(e.target.value)}
                  placeholder="Informe algum contato específico, prazo desejado ou particularidade da minuta..."
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 transition-colors resize-none"/>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setEtapa("minuta")} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              ← Voltar
            </button>
            <button
              disabled={!form.nome || !form.cpf || !form.email || (!minutaPropria && (!form.confirmaLeitura || !form.confirmaAutoridade)) || enviando}
              onClick={assinar}
              className={`flex-grow font-black py-3 px-8 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg text-white ${minutaPropria ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {enviando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  Enviando...
                </span>
              ) : minutaPropria ? "📨 Enviar solicitação" : "✅ Assinar convênio"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
