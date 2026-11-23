import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import Simulador from "./Simulador";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--f-display" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--f-body" });

export const metadata: Metadata = {
  title: "Franquia Smarter Estágios | Abra a sua agência de estágios com equipe digital",
  description: "Uma operação de estágios recorrente, com sistema próprio, treinamento e funcionários digitais ao seu lado. Conheça o modelo, os números e simule o seu cenário.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const digitos = (v?: string) => (v || "").replace(/\D/g, "").slice(0, 15);
const nomeLimpo = (v?: string) => (v || "").replace(/[<>]/g, "").trim().slice(0, 60);

const AZUL = "bg-[#102657]";
const AZUL_ESCURO = "bg-[#0A1A40]";

const Secao = ({ id, kicker, titulo, sub, children, escuro, papel }: { id: string; kicker?: string; titulo: string; sub?: string; children: React.ReactNode; escuro?: boolean; papel?: boolean }) => (
  <section id={id} className={escuro ? `${AZUL_ESCURO} text-white` : papel ? "bg-[#F4F1E8] text-[#0E1226]" : "bg-[#FAFAF7] text-[#0E1226]"}>
    <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      {kicker && <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D08609]">{kicker}</p>}
      <h2 className="mt-2 max-w-3xl text-3xl md:text-5xl font-extrabold leading-[1.05] tracking-tight" style={{ fontFamily: "var(--f-display)" }}>{titulo}</h2>
      {sub && <p className={`mt-4 max-w-2xl text-base md:text-lg ${escuro ? "text-white/75" : "text-[#5B6079]"}`}>{sub}</p>}
      <div className="mt-10">{children}</div>
    </div>
  </section>
);

const Numero = ({ n, l, f }: { n: string; l: string; f: string }) => (
  <div className="rounded-3xl bg-white p-6 border border-[#E5E3DA] shadow-sm">
    <p className="text-4xl md:text-5xl font-extrabold text-[#102657]" style={{ fontFamily: "var(--f-display)" }}>{n}</p>
    <p className="mt-2 text-sm font-semibold text-[#0E1226]">{l}</p>
    <p className="mt-2 text-[11px] text-[#5B6079]">Fonte: {f}</p>
  </div>
);

export default function FranquiaPage({ searchParams }: { searchParams: { w?: string; v?: string } }) {
  const wa = digitos(searchParams.w);
  const vendedor = nomeLimpo(searchParams.v);
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Olá! Vi a apresentação da franquia Smarter e quero conversar.")}` : null;

  return (
    <main className={`${display.variable} ${body.variable} min-h-screen scroll-smooth`} style={{ fontFamily: "var(--f-body)" }}>
      <header className="sticky top-0 z-30 bg-[#0A1A40]/95 backdrop-blur border-b border-white/10 print:hidden">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-smarter-white-vertical.png" alt="Smarter Estágios" className="h-8 w-auto" />
          <nav className="hidden lg:flex gap-6 text-sm font-semibold text-white/75">
            <a href="#mercado">Mercado</a><a href="#modelo">Modelo</a><a href="#equipe">Equipe digital</a><a href="#simulador">Simulador</a><a href="#investimento">Investimento</a><a href="#duvidas">Dúvidas</a>
          </nav>
          {waLink && <a href={waLink} className="rounded-xl bg-[#FAA419] px-4 py-2 text-sm font-black text-[#0A1A40]">Falar agora</a>}
        </div>
      </header>

      {/* HERO */}
      <section className={`${AZUL_ESCURO} relative overflow-hidden text-white`}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#FAA419]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#1d4a9a]/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 md:py-28 lg:grid-cols-5 lg:items-center">
          <div className="lg:col-span-3">
            <p className="inline-block rounded-full border border-[#FAA419]/50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#FAA419]">Franquia Smarter Estágios</p>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.02] tracking-tight" style={{ fontFamily: "var(--f-display)" }}>
              Cada empresa que você fecha pode virar <span className="text-[#FAA419]">receita todos os meses.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl text-white/80">
              Uma agência de estágios com sistema próprio, treinamento e uma equipe digital trabalhando ao seu lado, para você dedicar o seu tempo ao que mais gera resultado: <b className="text-white">conversar com empresas e estudantes.</b>
            </p>
            {vendedor && <p className="mt-5 text-sm text-white/60">Apresentação preparada por <b className="text-white">{vendedor}</b>.</p>}
            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              {waLink && <a href={waLink} className="rounded-2xl bg-[#FAA419] px-7 py-4 font-black text-[#0A1A40] shadow-lg shadow-[#FAA419]/20">Quero conversar sobre a minha unidade</a>}
              <a href="#simulador" className="rounded-2xl border border-white/30 px-7 py-4 font-bold">Simular o meu cenário</a>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-widest text-[#FAA419]">A rede Smarter em números</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[["2021", "início da operação"], ["19", "unidades com operação ou contrato ativo"], ["+500", "empresas atendidas ou parceiras"]].map(([n, l]) => (
                  <div key={n} className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>{n}</p><p className="mt-1 text-[11px] leading-tight text-white/70">{l}</p></div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-white/10 p-4 text-center"><p className="text-3xl font-extrabold text-[#FAA419]" style={{ fontFamily: "var(--f-display)" }}>+6.000</p><p className="text-xs text-white/70">estudantes cadastrados, encaminhados, contratados ou acompanhados</p></div>
              <p className="mt-3 text-[10px] text-white/45">Dados internos e históricos da rede, data-base jul/2026 (COF).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ESPELHO / SIM-SET */}
      <Secao id="espelho" kicker="Você já percebeu que..." titulo="Toda empresa precisa de gente nova. Poucas têm tempo de fazer isso direito.">
        <div className="grid gap-4 md:grid-cols-3">
          {[["Empresas querem estagiários", "Mas travam na burocracia: contrato, instituição de ensino, seguro, renovação e prazos legais."], ["Estudantes querem uma primeira chance", "E precisam de alguém que conecte o perfil certo à vaga certa, perto de casa."], ["Alguém precisa fazer essa ponte", "Quem organiza esse processo com método e tecnologia ocupa um lugar valioso na sua cidade."]].map(([t, d]) => (
            <div key={t} className="rounded-3xl border border-[#E5E3DA] bg-white p-7 shadow-sm"><p className="text-lg font-extrabold text-[#102657]" style={{ fontFamily: "var(--f-display)" }}>{t}</p><p className="mt-3 text-sm text-[#5B6079]">{d}</p></div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-lg font-semibold text-[#102657]">E se esse lugar fosse seu?</p>
      </Secao>

      {/* MERCADO */}
      <Secao id="mercado" papel kicker="O mercado" titulo="Um mercado grande, que já cresce sem depender de você." sub="Números públicos, com fonte. Eles mostram o tamanho do campo, não o resultado de uma unidade específica.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Numero n="877 mil" l="contratações de estagiários em 2024, contra 642 mil no ano anterior (+37%)" f="Ministério do Trabalho e Emprego, divulgado pela imprensa" />
          <Numero n="≈ 1 milhão" l="é a projeção de contratações de estágio para 2025, maior volume da série histórica" f="Pnad Contínua / projeção divulgada pela imprensa" />
          <Numero n="10,2 mi" l="de matrículas no ensino superior em 2024, o maior número da série recente" f="Censo da Educação Superior (Inep), via Agência Brasil" />
          <Numero n="≈ 80%" l="dos estagiários cursam o ensino superior, o público-alvo natural das empresas" f="CIEE" />
        </div>
        <p className="mt-6 max-w-3xl text-sm text-[#5B6079]">Cada contratação de estágio é um contrato que precisa de gestão do início ao fim. É exatamente aí que a sua unidade atua.</p>
      </Secao>

      {/* MODELO */}
      <Secao id="modelo" kicker="O modelo" titulo="Receita que se repete, mês após mês." sub="Você não vende uma vez e recomeça do zero. Cada estágio ativo permanece em carteira enquanto durar, em geral por vários meses.">
        <div className="grid gap-5 md:grid-cols-3">
          {[["1", "Você fecha a empresa", "Uma conversa bem feita abre a porta para uma ou mais vagas."], ["2", "O sistema cuida do ciclo", "Contrato, documentos, avaliações, renovação e fim de estágio organizados em um só lugar."], ["3", "A carteira cresce", "Cada contrato ativo soma à receita mensal da sua unidade. Quanto mais empresas, mais forte fica a base."]].map(([n, t, d]) => (
            <div key={n} className="relative rounded-3xl bg-[#102657] p-8 text-white">
              <span className="absolute -top-4 left-6 grid h-10 w-10 place-items-center rounded-full bg-[#FAA419] text-lg font-black text-[#0A1A40]">{n}</span>
              <p className="mt-3 text-xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>{t}</p><p className="mt-3 text-sm text-white/75">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Sem royalties", "Sem taxa de publicidade", "Sem taxa anual de evento"].map(t => (
            <div key={t} className="flex items-center gap-3 rounded-2xl border border-[#E5E3DA] bg-white p-5"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#14B870] text-white font-black">✓</span><span className="font-bold text-[#102657]">{t}</span></div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#5B6079]">Conforme a COF vigente. Há taxa mensal de sistema e valor por estagiário ativo, detalhados mais abaixo.</p>
      </Secao>

      {/* EQUIPE DIGITAL */}
      <Secao id="equipe" escuro kicker="Sua equipe digital" titulo="Dois funcionários digitais que preparam o terreno. Você faz a venda." sub="Eles reduzem o trabalho repetitivo e organizam o seu dia. O relacionamento, a conversa e o fechamento continuam sendo seus, e é por isso que o negócio é seu.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white/10 p-8 border border-white/10">
            <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FAA419] text-2xl">🧑‍💻</span><div><p className="text-2xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>Victor</p><p className="text-sm font-bold text-[#FAA419]">Sales · comercial</p></div></div>
            <p className="mt-6 text-xs font-black uppercase tracking-widest text-white/50">O que o Victor faz</p>
            <ul className="mt-2 space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Busca empresas da região da sua unidade.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Registra cada uma no CRM, com os contatos disponíveis.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Envia por e-mail a primeira apresentação da Smarter.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Avisa você quando chega a hora do contato humano.</li>
            </ul>
            <div className="mt-5 rounded-2xl bg-[#FAA419] p-4 text-[#0A1A40]"><p className="text-xs font-black uppercase tracking-widest">E depois?</p><p className="mt-1 text-sm font-bold">É você quem liga, manda mensagem, visita, negocia e fecha. A abertura de portas é do Victor; o fechamento é seu.</p></div>
          </div>
          <div className="rounded-[2rem] bg-white/10 p-8 border border-white/10">
            <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FAA419] text-2xl">👩‍💼</span><div><p className="text-2xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>Lia</p><p className="text-sm font-bold text-[#FAA419]">RH · administrativo</p></div></div>
            <p className="mt-6 text-xs font-black uppercase tracking-widest text-white/50">O que a Lia faz</p>
            <ul className="mt-2 space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Procura, na base do sistema, estudantes da sua região compatíveis com cada vaga.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Mostra no painel Hoje o que fazer, por ordem de urgência.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Cuida dos lembretes de renovação, avaliação, fim de estágio e pesquisa.</li>
              <li className="flex gap-2"><span className="text-[#FAA419]">●</span>Cobra o retorno de quem demora a responder.</li>
            </ul>
            <div className="mt-5 rounded-2xl bg-[#FAA419] p-4 text-[#0A1A40]"><p className="text-xs font-black uppercase tracking-widest">E se faltar candidato?</p><p className="mt-1 text-sm font-bold">Quando a base ainda não tem estudantes suficientes na região, você capta: escolas, faculdades e redes sociais. A Lia indica onde divulgar e entrega o texto pronto.</p></div>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-base font-semibold text-white/85">Entregamos as ferramentas e o método. A sua dedicação define o tamanho da carteira. Por isso não prometemos resultado; mostramos o caminho.</p>
      </Secao>

      {/* SISTEMA / MOCK */}
      <Secao id="sistema" kicker="Na prática" titulo="Abra o sistema e saiba o que fazer agora." sub="Tudo começa na tela Hoje, com as tarefas que mais importam no topo.">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#E5E3DA] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E3DA] pb-3"><span className="text-sm font-extrabold text-[#102657]">Hoje</span><span className="rounded-full bg-[#FAA419]/20 px-3 py-1 text-[11px] font-black text-[#D08609]">Sua agenda do dia</span></div>
            <div className="mt-4 space-y-3">
              {[["📞", "Contatos humanos pendentes", "Empresas captadas esperando a sua conversa", "bg-[#FF5A3C]"], ["🎯", "Vagas prontas para seleção", "Candidatos aceitaram: marque o processo", "bg-[#FAA419]"], ["📣", "Vagas sem candidatos", "Veja onde divulgar, com texto pronto", "bg-[#102657]"], ["📄", "Contratos e documentos", "Pendências organizadas por prazo", "bg-[#14B870]"]].map(([i, t, d, c]) => (
                <div key={t} className="flex items-center gap-3 rounded-2xl bg-[#FAFAF7] p-3 border border-[#E5E3DA]"><span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${c}`}>{i}</span><div><p className="text-sm font-extrabold text-[#0E1226]">{t}</p><p className="text-xs text-[#5B6079]">{d}</p></div></div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <p className="text-xl md:text-2xl font-extrabold text-[#102657]" style={{ fontFamily: "var(--f-display)" }}>Imagine começar o dia sabendo exatamente quem você precisa procurar.</p>
            <ul className="space-y-3 text-[#0E1226]">
              {["Rotina de cerca de 1 hora por dia nas tarefas de gestão, com o restante do tempo livre para vender.", "Treinamento inicial 100% digital, com avaliação, antes de liberar o seu acesso ao sistema.", "3 meses de trilha guiada dentro do próprio sistema, na aba Treinamentos."].map(t => (
                <li key={t} className="flex gap-3"><span className="mt-1 grid h-5 w-5 flex-none place-items-center rounded-full bg-[#14B870] text-[11px] font-black text-white">✓</span><span className="text-sm md:text-base">{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* SEMANA 1 */}
      <Secao id="semana" papel kicker="Começo guiado" titulo="Você não começa sozinho. Começa com um roteiro." sub="Metas de referência para acompanhar o seu ritmo. Não são garantia de resultado.">
        <ol className="grid gap-4 md:grid-cols-5">
          {[["Dia 1", "Configuração guiada pela Lia, definição da região e abertura do mês."], ["Dia 2", "Região conferida e primeiras empresas captadas no CRM."], ["Dia 3", "Seus primeiros contatos humanos, por WhatsApp ou ligação."], ["Dia 5", "Empresa interessada recebe o levantamento de perfil da vaga."], ["Depois", "A vaga abre, a base é consultada e você marca a seleção."]].map(([d, t], i) => (
            <li key={d} className="rounded-3xl bg-white border border-[#E5E3DA] p-5"><p className="text-xs font-black uppercase tracking-widest text-[#D08609]">{d}</p><p className="mt-2 text-sm text-[#0E1226]">{t}</p><div className="mt-4 h-1.5 rounded-full bg-[#E5E3DA]"><div className="h-full rounded-full bg-[#FAA419]" style={{ width: `${(i + 1) * 20}%` }} /></div></li>
          ))}
        </ol>
      </Secao>

      {/* TRILHA 30 */}
      <Secao id="trilha" escuro kicker="Rota dos 30 contratos" titulo="Uma meta clara e um painel que mostra se você está no ritmo." sub="A Smarter acompanha a evolução de cada unidade nova e ajuda a corrigir a rota quando o ritmo cai.">
        <div className="grid gap-5 md:grid-cols-4">
          {[["28 dias", "1º contrato"], ["56 dias", "5 contratos"], ["112 dias", "10 contratos"], ["240 dias", "30 contratos"]].map(([d, m]) => (
            <div key={d} className="rounded-3xl border border-white/15 bg-white/10 p-6 text-center"><p className="text-xs font-black uppercase tracking-widest text-[#FAA419]">Marco de referência</p><p className="mt-2 text-3xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>{m}</p><p className="mt-1 text-sm text-white/70">em até {d}</p></div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl bg-[#FAA419] p-6 text-[#0A1A40] md:flex md:items-center md:gap-6">
          <p className="text-5xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>10</p>
          <p className="mt-2 md:mt-0 text-base font-bold">visitas ou conversas presenciais com empresas por semana é o ritmo que a rede acompanha. Se você ficar abaixo, a Lia avisa na quinta-feira, antes de a semana acabar.</p>
        </div>
        <p className="mt-4 text-xs text-white/55">Marcos de acompanhamento, não promessa de resultado. Cada unidade evolui conforme a região, a dedicação e o mercado local.</p>
      </Secao>

      {/* SIMULADOR */}
      <Secao id="simulador" escuro kicker="Faça a conta com a sua cabeça" titulo="Simule receita, LTV e payback com as suas próprias premissas." sub="Mexa nos controles. Os custos da Smarter já estão embutidos: R$ 400 de sistema por mês e R$ 13 por estagiário ativo.">
        <Simulador />
      </Secao>

      {/* INVESTIMENTO */}
      <Secao id="investimento" papel kicker="Investimento" titulo="Comece enxuto. Cresça no seu ritmo." sub="Valores de tabela da COF vigente. Condições promocionais e formas de pagamento são apresentadas pelo seu consultor.">
        <div className="grid gap-5 md:grid-cols-2">
          {[["Home Office", "R$ 17.000", "Taxa de franquia", "Investimento total estimado de R$ 27.300 a R$ 42.500, incluindo equipamentos, regularização, ferramentas, marketing inicial e capital de giro recomendado.", false], ["Escritório", "R$ 25.000", "Taxa de franquia", "Investimento total estimado de R$ 60.000 a R$ 93.000, incluindo adequação do espaço, mobiliário, caução e capital de giro recomendado.", true]].map(([n, v, l, d, e]) => (
            <div key={String(n)} className={`rounded-[2rem] p-8 border ${e ? "bg-white border-[#E5E3DA]" : "bg-[#102657] text-white border-[#102657]"}`}>
              {!e && <span className="rounded-full bg-[#FAA419] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#0A1A40]">Porta de entrada mais leve</span>}
              <p className="mt-3 text-xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>{n}</p>
              <p className="mt-2 text-5xl font-extrabold" style={{ fontFamily: "var(--f-display)" }}>{v}</p>
              <p className={`text-sm font-bold ${e ? "text-[#D08609]" : "text-[#FAA419]"}`}>{l}</p>
              <p className={`mt-4 text-sm ${e ? "text-[#5B6079]" : "text-white/75"}`}>{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[["R$ 400/mês", "taxa de sistema"], ["R$ 13/mês", "por estagiário ativo, já com seguro de acidentes pessoais"], ["Pagamento", "À vista ou até 12x no cartão, com entrada mínima de 40%"]].map(([a, b]) => (
            <div key={a} className="rounded-2xl border border-[#E5E3DA] bg-white p-5"><p className="text-xl font-extrabold text-[#102657]" style={{ fontFamily: "var(--f-display)" }}>{a}</p><p className="mt-1 text-sm text-[#5B6079]">{b}</p></div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-[#5B6079]">Valores sujeitos a reajuste anual pelo INPC, conforme a COF. Estimativas de investimento variam com as escolhas e a região de cada franqueado.</p>
      </Secao>

      {/* PARA QUEM */}
      <Secao id="perfil" kicker="Transparência" titulo="Essa franquia é para quem quer construir, não só comprar." sub="Preferimos ser claros agora a gerar dúvida depois.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-[#102657] p-8 text-white">
            <p className="text-lg font-extrabold text-[#FAA419]" style={{ fontFamily: "var(--f-display)" }}>É para você se...</p>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              {["Você gosta de conversar com pessoas e fechar parcerias.", "Está disposto a fazer contato humano com as empresas, no mesmo dia em que elas aparecem.", "Aceita captar estudantes na sua região quando a base ainda for pequena.", "Quer um negócio com método, treinamento e tecnologia, e não uma ideia a ser inventada do zero."].map(t => <li key={t} className="flex gap-2"><span className="text-[#FAA419]">✓</span>{t}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-[#E5E3DA] bg-white p-8">
            <p className="text-lg font-extrabold text-[#102657]" style={{ fontFamily: "var(--f-display)" }}>O que combinamos desde já</p>
            <ul className="mt-4 space-y-3 text-sm text-[#0E1226]">
              {["Os funcionários digitais ajudam, mas não substituem a sua atuação.", "Não prometemos número de empresas, vagas, faturamento ou retorno.", "A prospecção fica restrita às regiões cadastradas para a sua unidade.", "O primeiro contato automático é por e-mail; WhatsApp e outras integrações dependem de parceiro externo conectado pela Smarter."].map(t => <li key={t} className="flex gap-2"><span className="text-[#D08609]">●</span>{t}</li>)}
            </ul>
          </div>
        </div>
      </Secao>

      {/* FAQ */}
      <Secao id="duvidas" papel titulo="Perguntas que costumam aparecer">
        <div className="max-w-3xl space-y-3">
          {[["O Victor fecha as vendas por mim?", "Não. Ele busca empresas, registra no CRM e envia a primeira apresentação por e-mail. Quem conversa, negocia e fecha é você."], ["A Lia traz os estudantes sozinha?", "Ela procura candidatos na base do sistema, na sua região. Quando a base ainda não tem perfil suficiente, você capta estudantes na região e a Lia indica onde divulgar, com texto pronto."], ["Preciso ter experiência com estágios?", "Não. O treinamento inicial é digital, com avaliação, e a trilha guiada acompanha os seus primeiros meses."], ["E se a minha região for pequena?", "A franqueadora pode cadastrar várias cidades e bairros para a sua unidade."], ["Preciso abrir ferramentas externas?", "A operação acontece dentro do Sistema Smarter."], ["Os e-mails caem no spam?", "Têm link de descadastro e envio em volume controlado, mas a entrega na caixa de entrada não é garantida. Por isso o contato humano é central."], ["Existe garantia de retorno?", "Não. Nenhuma franquia séria pode garantir. A COF traz todas as regras, e a simulação desta página é um exemplo com premissas que você mesmo ajusta."]].map(([q, a]) => (
            <details key={q} className="rounded-2xl border border-[#E5E3DA] bg-white p-5"><summary className="cursor-pointer font-bold text-[#102657]">{q}</summary><p className="mt-3 text-sm text-[#5B6079]">{a}</p></details>
          ))}
        </div>
      </Secao>

      {/* CTA */}
      <section className="bg-[#FAA419] text-[#0A1A40]">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight" style={{ fontFamily: "var(--f-display)" }}>Daqui a 12 meses, você vai ter uma carteira de empresas ou só a vontade de ter começado?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg font-semibold">O próximo passo é simples: ler a COF, tirar as dúvidas com o consultor e, se fizer sentido, preencher o cadastro de fechamento. A decisão é sua, e o roteiro já está pronto.</p>
          {waLink && <a href={waLink} className="mt-8 inline-block rounded-2xl bg-[#0A1A40] px-9 py-4 text-lg font-black text-white print:hidden">Falar com {vendedor || "um consultor"}</a>}
        </div>
      </section>

      <footer className={`${AZUL_ESCURO} text-white/60`}>
        <div className="mx-auto max-w-6xl px-5 py-10 text-[11px] leading-relaxed space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-smarter-white-vertical.png" alt="Smarter Estágios" className="h-7 w-auto mb-4" />
          <p><b className="text-white/80">Aviso importante.</b> Esta apresentação não é oferta de franquia nem substitui a Circular de Oferta de Franquia (COF) e o contrato, que prevalecem em caso de divergência. Nenhum representante está autorizado a garantir faturamento, lucro, retorno, número de clientes ou de estagiários. A simulação é um exemplo condicionado às premissas informadas.</p>
          <p><b className="text-white/80">Fontes dos dados de mercado:</b> Ministério do Trabalho e Emprego (contratações de estagiários em 2024), Pnad Contínua/IBGE (projeção para 2025), Inep, Censo da Educação Superior (matrículas), CIEE (perfil dos estagiários), conforme divulgado pela imprensa. Dados da rede Smarter: internos e históricos, data-base jul/2026.</p>
          <p>Smarter Estágios Agente de Integração Ltda. · CNPJ 65.358.303/0001-26</p>
        </div>
      </footer>
    </main>
  );
}
