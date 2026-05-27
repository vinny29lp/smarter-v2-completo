"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const QUESTOES = [
  { id:1, texto:"Quando preciso resolver um problema, prefiro:", opcoes:[{d:"Agir rápido e decidir sozinho",i:"Buscar ideias com o grupo",s:"Avaliar com calma antes de agir",c:"Analisar dados e detalhes"}] },
  { id:2, texto:"Nas situações de pressão, costumo:", opcoes:[{d:"Assumir o controle",i:"Motivar o time",s:"Manter a calma",c:"Verificar erros e riscos"}] },
  { id:3, texto:"Me identifico mais como alguém:", opcoes:[{d:"Determinado e direto",i:"Criativo e entusiasmado",s:"Paciente e confiável",c:"Preciso e cuidadoso"}] },
  { id:4, texto:"No trabalho, valorizo mais:", opcoes:[{d:"Resultados e eficiência",i:"Relacionamentos e reconhecimento",s:"Estabilidade e harmonia",c:"Qualidade e precisão"}] },
  { id:5, texto:"Ao falar com pessoas, sou geralmente:", opcoes:[{d:"Direto e objetivo",i:"Animado e expressivo",s:"Receptivo e paciente",c:"Formal e reservado"}] },
  { id:6, texto:"Prefiro trabalhar em projetos que:", opcoes:[{d:"Exijam tomada de decisão rápida",i:"Permitam criatividade e interação",s:"Sejam estáveis e bem planejados",c:"Exijam atenção a detalhes"}] },
  { id:7, texto:"Meu maior ponto forte é:", opcoes:[{d:"Liderança e assertividade",i:"Persuasão e comunicação",s:"Cooperação e lealdade",c:"Análise e organização"}] },
  { id:8, texto:"Quando estou em grupo, geralmente:", opcoes:[{d:"Lidero a discussão",i:"Animo e envolvo todos",s:"Ouço antes de falar",c:"Faço perguntas para entender melhor"}] },
  { id:9, texto:"Sinto-me mais confortável quando:", opcoes:[{d:"Tenho controle sobre as decisões",i:"Posso interagir e me expressar",s:"O ambiente é previsível e tranquilo",c:"As regras e processos são claros"}] },
  { id:10, texto:"Diante de mudanças, costumo:", opcoes:[{d:"Abraçar e liderar a mudança",i:"Ver oportunidades e empolgar o time",s:"Aceitar, mas preferir estabilidade",c:"Analisar riscos antes de aceitar"}] },
];

const DISC_INFO: Record<string, {
  nome: string; emoji: string; cor: string; corBg: string; corBorda: string;
  desc: string; pontos: string; desafios: string; comunicacao: string;
  ambiente: string; motivadores: string; carreiras: string; lideranca: string;
}> = {
  D: {
    nome: "Dominância", emoji: "🔴", cor: "text-red-600", corBg: "bg-red-500", corBorda: "border-red-200",
    desc: "Você é direto, determinado e orientado a resultados. Toma decisões com confiança, enfrenta desafios de frente e não tem medo de assumir o controle. Pessoas com perfil D são movidas pela conquista e superação de obstáculos.",
    pontos: "Liderança natural · Tomada de decisão rápida · Foco em resultados · Assertividade · Iniciativa · Capacidade de superar obstáculos",
    desafios: "Pode ser percebido como impaciente · Dificuldade em ouvir outras perspectivas · Tendência a assumir riscos excessivos · Pode negligenciar detalhes",
    comunicacao: "Prefere comunicação direta e objetiva. Vai direto ao ponto, sem rodeios. Espera respostas rápidas e aprecia pessoas assertivas. Evite conversas longas sem conclusões claras.",
    ambiente: "Ambientes desafiadores com autonomia · Projetos com metas claras e mensuráveis · Situações que exijam liderança · Competição saudável",
    motivadores: "Poder e autoridade · Desafios e competição · Liberdade para agir · Resultados mensuráveis · Reconhecimento por conquistas",
    carreiras: "Empreendedorismo · Gestão executiva · Vendas de alto nível · Advocacia · Política · Gestão de projetos · Diretoria",
    lideranca: "Líder orientado a resultados. Define metas ambiciosas, toma decisões rapidamente e espera execução eficiente. Funciona melhor com autonomia total e desafios constantes.",
  },
  I: {
    nome: "Influência", emoji: "🟡", cor: "text-yellow-600", corBg: "bg-yellow-400", corBorda: "border-yellow-200",
    desc: "Você é comunicativo, entusiasta e persuasivo. Inspira as pessoas ao redor com energia positiva e tem um dom natural para construir relacionamentos. Perfis I são criativos, otimistas e excelentes com pessoas.",
    pontos: "Comunicação persuasiva · Criatividade e inovação · Capacidade de motivar · Otimismo · Networking · Empatia e carisma",
    desafios: "Pode ser desorganizado · Dificuldade em manter foco · Pode evitar conflitos necessários · Tendência a prometer mais do que entrega",
    comunicacao: "Comunicação calorosa, entusiasta e expressiva. Usa histórias para ilustrar pontos. Aprecia feedback positivo e reconhecimento público.",
    ambiente: "Ambientes colaborativos e dinâmicos · Projetos criativos · Trabalho em equipe · Reconhecimento público · Variedade de atividades",
    motivadores: "Reconhecimento social · Novas experiências · Trabalho em equipe · Liberdade de expressão · Influência sobre outros",
    carreiras: "Marketing e Publicidade · Recursos Humanos · Relações Públicas · Treinamento · Vendas · Coaching · Educação · Comunicação",
    lideranca: "Líder inspirador e motivador. Cria ambientes positivos e entusiasma a equipe. Excelente para engajar pessoas em projetos novos.",
  },
  S: {
    nome: "Estabilidade", emoji: "🟢", cor: "text-green-600", corBg: "bg-green-500", corBorda: "border-green-200",
    desc: "Você é paciente, confiável e colaborativo. Traz harmonia e equilíbrio ao ambiente de trabalho e é o pilar de sustentação das equipes. Perfis S são leais, consistentes e excelentes ouvintes.",
    pontos: "Lealdade e comprometimento · Paciência e escuta ativa · Trabalho em equipe · Consistência · Mediação de conflitos · Diplomacia",
    desafios: "Resistência a mudanças · Dificuldade em dizer não · Pode evitar confrontos · Tendência a não expressar opiniões · Pode ser visto como passivo",
    comunicacao: "Comunicação calma, sincera e empática. Prefere conversas individuais. É um ouvinte excepcional. Aprecia estabilidade nas relações.",
    ambiente: "Ambientes estáveis e previsíveis · Equipes coesas · Processos claros · Trabalho colaborativo · Reconhecimento por dedicação",
    motivadores: "Segurança e estabilidade · Relações de confiança · Reconhecimento por lealdade · Harmonia · Sentimento de pertencimento",
    carreiras: "Recursos Humanos · Psicologia · Enfermagem · Assistência Social · Educação · Serviço ao cliente · Administração",
    lideranca: "Líder servidor e colaborativo. Prioriza o bem-estar da equipe e cria ambientes harmoniosos. Excelente mediador de conflitos.",
  },
  C: {
    nome: "Conformidade", emoji: "🔵", cor: "text-blue-600", corBg: "bg-blue-500", corBorda: "border-blue-200",
    desc: "Você é analítico, preciso e cuidadoso. Garante qualidade através da atenção meticulosa aos detalhes. Perfis C são sistemáticos e excelentes em resolver problemas complexos com rigor e precisão.",
    pontos: "Análise crítica · Organização e planejamento · Atenção a detalhes · Alta qualidade · Resolução sistemática · Expertise técnica",
    desafios: "Pode ser excessivamente perfeccionista · Dificuldade em tomar decisões rápidas · Análise paralisante · Pode parecer frio ou distante",
    comunicacao: "Comunicação formal, precisa e baseada em dados. Prefere informações detalhadas e documentadas. Valoriza argumentos bem fundamentados.",
    ambiente: "Ambientes estruturados com processos claros · Trabalho analítico · Autonomia para verificar qualidade · Padrões elevados de excelência",
    motivadores: "Qualidade e excelência · Expertise e conhecimento · Processos estruturados · Independência analítica · Precisão",
    carreiras: "Engenharia · Finanças e Contabilidade · Ciência de Dados · Direito · Medicina · Pesquisa · Auditoria · TI · Arquitetura",
    lideranca: "Líder analítico e sistemático. Define processos claros e padrões elevados. Toma decisões baseadas em dados e rigor técnico.",
  },
};

function BarraDisc({ tipo, percentual }: { tipo: string; percentual: number }) {
  const info = DISC_INFO[tipo];
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.emoji}</span>
          <span className="text-sm font-bold text-slate-700">{tipo} — {info.nome}</span>
        </div>
        <span className={`text-lg font-black ${info.cor}`}>{percentual}%</span>
      </div>
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-4 ${info.corBg} rounded-full`} style={{ width: `${percentual}%` }} />
      </div>
    </div>
  );
}

function RadarChart({ grafico }: { grafico: Record<string, number> }) {
  const cx = 100, cy = 100, r = 75;
  const labels = ["D", "I", "S", "C"];
  const angles = labels.map((_, i) => (i * Math.PI * 2) / 4 - Math.PI / 2);
  const cores: Record<string, string> = { D: "#ef4444", I: "#eab308", S: "#22c55e", C: "#3b82f6" };
  const points = labels.map((l, i) => ({
    x: cx + r * (grafico[l] / 100) * Math.cos(angles[i]),
    y: cy + r * (grafico[l] / 100) * Math.sin(angles[i]),
  }));
  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((lvl, gi) => (
        <polygon key={gi} points={angles.map(a => `${cx + r * lvl * Math.cos(a)},${cy + r * lvl * Math.sin(a)}`).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />)}
      <polygon points={polygon} fill="rgba(15,42,94,0.15)" stroke="#0f2a5e" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={cores[labels[i]]} />)}
      {labels.map((l, i) => {
        const lx = cx + (r + 18) * Math.cos(angles[i]);
        const ly = cy + (r + 18) * Math.sin(angles[i]);
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill={cores[l]}>{l}</text>;
      })}
    </svg>
  );
}

export default function DiscTestPage() {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<string | null>(null);
  const [grafico, setGrafico] = useState<Record<string, number>>({ D: 0, I: 0, S: 0, C: 0 });
  const [refazer, setRefazer] = useState(false);

  // Carrega resultado salvo ao abrir a página
  useEffect(() => {
    fetch("/api/portal/estudante/disc")
      .then(r => r.json())
      .then(d => {
        if (d.discResult && d.discData?.grafico) {
          setResultado(d.discResult);
          setGrafico(d.discData.grafico);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const responder = (qId: number, tipo: string) => setRespostas(p => ({ ...p, [qId]: tipo }));

  const calcularResultado = () => {
    const contagem: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(respostas).forEach(r => { contagem[r]++; });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
  };

  const finalizar = async () => {
    if (Object.keys(respostas).length < QUESTOES.length) return;
    setLoading(true);
    const result = calcularResultado();
    const graf: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(respostas).forEach(r => { graf[r as keyof typeof graf]++; });
    Object.keys(graf).forEach(k => {
      graf[k as keyof typeof graf] = Math.round((graf[k as keyof typeof graf] / QUESTOES.length) * 100);
    });
    setGrafico(graf);
    try {
      await fetch("/api/portal/estudante/disc", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultado: result, respostas, grafico: graf }),
      });
    } catch {}
    setResultado(result);
    setRefazer(false);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0f2a5e] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-slate-500 text-sm">Carregando seu relatório...</p>
        </div>
      </div>
    );
  }

  if (resultado && !refazer) {
    const primario = DISC_INFO[resultado];
    const ordenado = Object.entries(grafico).sort((a, b) => b[1] - a[1]);
    const secKey = ordenado[1]?.[0] !== resultado ? ordenado[1]?.[0] : null;
    const infoSec = secKey ? DISC_INFO[secKey] : null;
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{primario.emoji}</div>
          <h1 className="text-3xl font-black text-slate-800">Seu Perfil DISC</h1>
          <p className="text-slate-500 text-sm mt-1">Relatório completo de comportamento profissional</p>
        </div>
        <Card className={`p-6 mb-6 border-2 ${primario.corBorda}`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{primario.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-2xl font-black ${primario.cor}`}>{resultado}</span>
                <span className="text-xl font-bold text-slate-800">— {primario.nome}</span>
                <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-3 py-1 font-semibold">Perfil Primário</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{primario.desc}</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">Distribuição DISC</h2>
            {["D","I","S","C"].map(tipo => <BarraDisc key={tipo} tipo={tipo} percentual={grafico[tipo]} />)}
          </Card>
          <Card className="p-6 flex flex-col items-center justify-center">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">Mapa de Perfil</h2>
            <RadarChart grafico={grafico} />
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {["D","I","S","C"].map(t => (
                <span key={t} className={`text-xs font-bold px-2 py-1 rounded ${DISC_INFO[t].cor} bg-slate-50 border ${DISC_INFO[t].corBorda}`}>{t}: {grafico[t]}%</span>
              ))}
            </div>
          </Card>
        </div>
        {infoSec && (
          <Card className="p-5 mb-6 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{infoSec.emoji}</span>
              <div>
                <span className="text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-3 py-0.5 font-semibold mr-2">Perfil Secundário</span>
                <span className={`font-black ${infoSec.cor}`}>{secKey} — {infoSec.nome}</span>
              </div>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">{infoSec.desc}</p>
          </Card>
        )}
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">💪 Pontos Fortes</h2>
          <div className="flex flex-wrap gap-2">
            {primario.pontos.split(" · ").map((p, i) => (
              <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${primario.corBorda} ${primario.cor} bg-slate-50`}>{p}</span>
            ))}
          </div>
        </Card>
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">🎯 Pontos de Desenvolvimento</h2>
          <div className="flex flex-wrap gap-2">
            {primario.desafios.split(" · ").map((p, i) => (
              <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50">{p}</span>
            ))}
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Card className="p-5">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">💬 Estilo de Comunicação</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{primario.comunicacao}</p>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">🏢 Ambiente Ideal</h2>
            <div className="space-y-1">
              {primario.ambiente.split(" · ").map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-green-500 mt-0.5">✓</span><span>{a}</span></div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">⚡ Motivadores</h2>
            <div className="space-y-1">
              {primario.motivadores.split(" · ").map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600"><span className={`${primario.cor} mt-0.5`}>→</span><span>{m}</span></div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">👑 Estilo de Liderança</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{primario.lideranca}</p>
          </Card>
        </div>
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">🚀 Carreiras com Alta Afinidade</h2>
          <div className="flex flex-wrap gap-2">
            {primario.carreiras.split(" · ").map((c, i) => (
              <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${primario.corBg} text-white`}>{c}</span>
            ))}
          </div>
        </Card>
        <Card className="p-6 mb-6 bg-[#0f2a5e] text-white">
          <h2 className="text-sm font-black uppercase tracking-wider mb-3 text-blue-200">📚 Sobre a Metodologia DISC</h2>
          <p className="text-xs text-blue-100 leading-relaxed mb-3">O modelo DISC foi desenvolvido pelo psicólogo William Moulton Marston na década de 1920 e é hoje uma das ferramentas de avaliação comportamental mais utilizadas no mundo corporativo. Mais de 40 milhões de pessoas já foram avaliadas.</p>
          <div className="grid grid-cols-2 gap-3">
            {["D","I","S","C"].map(t => (
              <div key={t} className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1"><span>{DISC_INFO[t].emoji}</span><span className="text-xs font-black">{t} — {DISC_INFO[t].nome}</span></div>
                <div className="text-xs text-blue-200">{grafico[t]}% do seu perfil</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-200 leading-relaxed mt-3">Nenhum perfil é melhor ou pior. Cada estilo tem pontos fortes únicos e contribui de forma diferente para o sucesso das equipes.</p>
        </Card>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button
            className="flex-1 justify-center bg-[#0f2a5e] text-white"
            onClick={() => window.open(`/api/portal/estudante/disc-relatorio`, "_blank")}
          >
            📄 Baixar Relatório PDF
          </Button>
          <Button
            className="flex-1 justify-center bg-white text-[#0f2a5e] border-2 border-[#0f2a5e] hover:bg-slate-50"
            onClick={() => { setRefazer(true); setRespostas({}); }}
          >
            🔄 Refazer Teste
          </Button>
          <Button
            className="flex-1 justify-center bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => router.push("/portal-estudante")}
          >
            ← Voltar ao Portal
          </Button>
        </div>
      </div>
    );
  }

  const progresso = Object.keys(respostas).length;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-800">Teste DISC</h1>
          {refazer && resultado && (
            <button
              onClick={() => { setRefazer(false); setRespostas({}); }}
              className="text-xs text-slate-400 hover:text-[#0f2a5e] font-medium transition-colors"
            >
              ← Voltar ao relatório salvo
            </button>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">Descubra seu perfil comportamental profissional. {progresso}/{QUESTOES.length} respondidas.</p>
        <div className="h-2 bg-slate-100 rounded-full mt-3">
          <div className="h-2 bg-[#0f2a5e] rounded-full transition-all" style={{ width: `${(progresso / QUESTOES.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-4">
        {QUESTOES.map(q => (
          <Card key={q.id} className={`p-5 transition-all ${respostas[q.id] ? "border border-emerald-200" : ""}`}>
            <p className="text-sm font-bold text-slate-800 mb-3">
              <span className="text-[#0f2a5e] font-black mr-2">{q.id}.</span> {q.texto}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(q.opcoes[0]).map(([tipo, texto]) => (
                <button key={tipo} onClick={() => responder(q.id, tipo.toUpperCase())}
                  className={`p-3 text-left text-xs rounded-xl border-2 transition-all font-medium ${
                    respostas[q.id] === tipo.toUpperCase()
                      ? "border-[#0f2a5e] bg-[#0f2a5e] text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  {texto as string}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">{QUESTOES.length - progresso} questões restantes</p>
        <Button onClick={finalizar} disabled={progresso < QUESTOES.length || loading} className="px-8">
          {loading ? "Calculando..." : progresso < QUESTOES.length ? `Responda mais ${QUESTOES.length - progresso}` : "Ver Resultado →"}
        </Button>
      </div>
    </div>
  );
}
