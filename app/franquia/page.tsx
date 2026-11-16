import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Franquia Smarter Estágios | Compre a franquia e ganhe funcionários digitais",
  description: "Conheça a franquia Smarter Estágios: sistema completo, assistente de implantação e dois funcionários digitais, a Lia (administrativo e RH) e o Victor (comercial), trabalhando desde a primeira semana.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const digitos = (v?: string) => (v || "").replace(/\D/g, "").slice(0, 15);
const nomeLimpo = (v?: string) => (v || "").replace(/[<>]/g, "").trim().slice(0, 60);

const Secao = ({ id, titulo, sub, children, escuro }: { id: string; titulo: string; sub?: string; children: React.ReactNode; escuro?: boolean }) => (
  <section id={id} className={escuro ? "bg-[#0f2a5e] text-white" : "bg-white text-slate-800"}>
    <div className="mx-auto max-w-5xl px-5 py-14 md:py-20">
      <h2 className="text-2xl md:text-3xl font-black tracking-tight">{titulo}</h2>
      {sub && <p className={`mt-3 max-w-2xl text-base md:text-lg ${escuro ? "text-white/75" : "text-slate-500"}`}>{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  </section>
);

export default function FranquiaPage({ searchParams }: { searchParams: { w?: string; v?: string } }) {
  const wa = digitos(searchParams.w);
  const vendedor = nomeLimpo(searchParams.v);
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Olá! Vi a apresentação da franquia Smarter e quero conversar.")}` : null;

  return (
    <main className="min-h-screen font-sans scroll-smooth">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 print:hidden">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <span className="font-black text-[#0f2a5e]">Smarter Estágios</span>
          <nav className="hidden md:flex gap-5 text-sm font-semibold text-slate-600">
            <a href="#equipe">Equipe digital</a><a href="#semana">1ª semana</a><a href="#rotina">Rotina</a><a href="#limites">Transparência</a><a href="#duvidas">Dúvidas</a>
          </nav>
          {waLink && <a href={waLink} className="rounded-lg bg-[#f5c400] px-3 py-1.5 text-xs font-black text-[#0f2a5e]">Falar agora</a>}
        </div>
      </header>

      <section className="bg-gradient-to-br from-[#0f2a5e] to-[#1d4a9a] text-white">
        <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
          <p className="text-sm font-bold uppercase tracking-widest text-[#f5c400]">Franquia Smarter Estágios</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black leading-tight max-w-3xl">Compre a franquia e já ganhe funcionários digitais.</h1>
          <p className="mt-5 max-w-2xl text-lg md:text-xl text-white/80">
            Você abre a sua unidade de agenciamento de estágios com um sistema completo e dois funcionários que começam a trabalhar na primeira semana: a <b>Lia</b>, no administrativo e RH, e o <b>Victor</b>, no comercial.
          </p>
          {vendedor && <p className="mt-6 text-sm text-white/70">Apresentação preparada por <b className="text-white">{vendedor}</b>.</p>}
          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            {waLink && <a href={waLink} className="rounded-xl bg-[#f5c400] px-6 py-3 font-black text-[#0f2a5e]">Quero conversar</a>}
            <a href="#equipe" className="rounded-xl border border-white/30 px-6 py-3 font-bold">Ver como funciona</a>
          </div>
        </div>
      </section>

      <Secao id="problema" titulo="O começo de um negócio trava em três pontos" sub="É onde a maioria das operações novas perde tempo e motivação.">
        <div className="grid gap-4 md:grid-cols-3">
          {[["Não saber por onde começar", "Muita coisa para configurar e nenhuma ordem clara."], ["Não ter empresas para visitar", "Sem prospecção, a agenda fica vazia nas primeiras semanas."], ["Perder tempo com burocracia", "Contratos, renovações, avaliações e prazos legais consomem o dia."]].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 p-6"><p className="font-black text-[#0f2a5e]">{t}</p><p className="mt-2 text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
      </Secao>

      <Secao id="equipe" escuro titulo="Sua equipe digital já vem contratada" sub="Eles fazem o trabalho repetitivo. Você entra com o que só uma pessoa faz: conversar, ligar, visitar e fechar.">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-white/10 p-7">
            <p className="text-3xl">👩‍💼</p><p className="mt-2 text-xl font-black">Lia — administrativo e RH</p>
            <ul className="mt-4 space-y-2 text-sm text-white/85 list-disc pl-5">
              <li>Guia o seu primeiro acesso e só libera o sistema com tudo configurado.</li>
              <li>Mostra no painel Hoje o que fazer, por ordem de urgência.</li>
              <li>Convida estudantes da sua região quando uma vaga abre.</li>
              <li>Cuida de renovações, avaliação semestral, fim de estágio e pesquisa de satisfação.</li>
              <li>Cobra retorno das empresas que demoram a responder.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white/10 p-7">
            <p className="text-3xl">🧑‍💻</p><p className="mt-2 text-xl font-black">Victor — comercial</p>
            <ul className="mt-4 space-y-2 text-sm text-white/85 list-disc pl-5">
              <li>Busca empresas somente na região da sua unidade, priorizando pequenas e médias.</li>
              <li>Registra cada empresa no CRM com os contatos disponíveis.</li>
              <li>Envia o primeiro e-mail de apresentação.</li>
              <li>Avisa você, em tela grande, quando é hora do contato humano.</li>
              <li>Entrega o link de apresentação pronto para enviar por WhatsApp.</li>
            </ul>
          </div>
        </div>
      </Secao>

      <Secao id="semana" titulo="Sua primeira semana, passo a passo" sub="Metas de referência para acompanhar o ritmo. Não são garantia de resultado.">
        <ol className="grid gap-4 md:grid-cols-5">
          {[["Dia 1", "Assistente da Lia conclui a configuração, define a região e abre o mês."], ["Dia 2", "Região conferida e primeiras empresas captadas no CRM."], ["Dia 3", "Primeiros contatos humanos por WhatsApp ou ligação."], ["Dia 5", "Primeira empresa interessada recebe o levantamento de perfil."], ["Depois", "Vaga abre sozinha, a Lia chama candidatos e você marca a seleção."]].map(([d, t]) => (
            <li key={d} className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-black uppercase text-[#c79a00]">{d}</p><p className="mt-2 text-sm text-slate-700">{t}</p></li>
          ))}
        </ol>
      </Secao>

      <Secao id="vaga" titulo="Da empresa interessada à vaga com candidatos" escuro sub="Três ações suas; o resto é automático.">
        <ol className="space-y-3 max-w-3xl">
          {["Você cadastra a empresa e envia o levantamento de perfil (por link ou WhatsApp).", "A empresa preenche título, curso, atividades, bolsa e horário.", "A vaga abre sozinha, com link público, e a Lia convida estudantes compatíveis da região.", "Sem candidatos? A Lia mostra onde divulgar: escolas, Indeed, InfoJobs e redes sociais, com texto pronto.", "Com 1 ou 2 aceites, ela avisa para você marcar o processo seletivo."].map((t, i) => (
            <li key={i} className="flex gap-4 rounded-xl bg-white/10 p-4"><span className="font-black text-[#f5c400]">{i + 1}</span><span className="text-sm md:text-base">{t}</span></li>
          ))}
        </ol>
      </Secao>

      <Secao id="rotina" titulo="Sua rotina cabe em cerca de 1 hora por dia" sub="Tudo começa na tela Hoje.">
        <div className="grid gap-4 md:grid-cols-2">
          {["Contatos humanos pendentes", "Vagas prontas para seleção", "Vagas sem candidatos", "Contratos e documentos pendentes"].map((t, i) => (
            <div key={t} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#0f2a5e] font-black text-white">{i + 1}</span><span className="font-semibold">{t}</span></div>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-500">Além disso, você tem 3 meses de treinamento guiado dentro do próprio sistema, na aba Treinamentos.</p>
      </Secao>

      <Secao id="limites" titulo="Transparência: o que esperamos de você" sub="Para o modelo funcionar, algumas coisas continuam sendo humanas." escuro>
        <ul className="grid gap-3 md:grid-cols-2">
          {["O contato humano com cada empresa captada, no mesmo dia, é obrigatório para o resultado aparecer.", "A prospecção fica exclusivamente nas regiões cadastradas para a sua unidade.", "Não prometemos número de empresas, vagas ou faturamento: acompanhamos esses indicadores com você.", "A Lia organiza e cobra, mas as decisões e o relacionamento com empresas e estudantes são seus.", "A prospecção automática e o WhatsApp dependem de integração com parceiro externo, conectada pela Smarter. Hoje o primeiro contato automático é por e-mail."].map(t => (
            <li key={t} className="rounded-xl bg-white/10 p-4 text-sm text-white/90">{t}</li>
          ))}
        </ul>
      </Secao>

      <Secao id="duvidas" titulo="Dúvidas frequentes">
        <div className="space-y-3 max-w-3xl">
          {[["Os funcionários digitais trabalham sozinhos?", "Eles fazem a parte repetitiva e avisam você do que depende de uma pessoa."], ["E se a minha região for pequena?", "A franqueadora pode cadastrar várias cidades e bairros para a sua unidade."], ["Preciso abrir ferramentas externas?", "Não. A operação acontece dentro do Sistema Smarter."], ["Os e-mails caem no spam?", "Têm link de descadastro e envio em volume controlado, mas a entrega na caixa de entrada não é garantida. Por isso o contato humano é central."], ["Qual o investimento?", "As condições são apresentadas pelo consultor na reunião."]].map(([q, a]) => (
            <details key={q} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold text-[#0f2a5e]">{q}</summary><p className="mt-2 text-sm text-slate-600">{a}</p></details>
          ))}
        </div>
      </Secao>

      <section className="bg-[#f5c400] text-[#0f2a5e]">
        <div className="mx-auto max-w-5xl px-5 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-black">Pronto para abrir a sua unidade?</h2>
          <p className="mt-2 font-semibold">Próximos passos: alinhar condições, assinar, cadastrar a sua região e agendar o primeiro acesso.</p>
          {waLink && <a href={waLink} className="mt-6 inline-block rounded-xl bg-[#0f2a5e] px-8 py-3 font-black text-white print:hidden">Falar com {vendedor || "um consultor"}</a>}
        </div>
      </section>
    </main>
  );
}
