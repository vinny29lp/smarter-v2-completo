"use client";
import { useState } from "react";
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

const DISC_RESULT: Record<string,{nome:string;emoji:string;desc:string;pontos:string}> = {
  D:{nome:"Dominância",emoji:"🔴",desc:"Você é direto, determinado e orientado a resultados. Gosta de desafios e toma decisões com confiança.",pontos:"Liderança natural, eficiência, foco em resultados"},
  I:{nome:"Influência",emoji:"🟡",desc:"Você é comunicativo, entusiasta e persuasivo. Inspira as pessoas ao redor com energia positiva.",pontos:"Comunicação, criatividade, capacidade de motivar"},
  S:{nome:"Estabilidade",emoji:"🟢",desc:"Você é paciente, confiável e colaborativo. Traz harmonia e equilíbrio para o ambiente de trabalho.",pontos:"Lealdade, paciência, trabalho em equipe"},
  C:{nome:"Conformidade",emoji:"🔵",desc:"Você é analítico, preciso e cuidadoso. Garante qualidade através da atenção aos detalhes.",pontos:"Análise, organização, precisão"},
};

export default function DiscTestPage() {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Record<number,string>>({});
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string|null>(null);

  const responder = (qId: number, tipo: string) => {
    setRespostas(p => ({...p,[qId]:tipo}));
  };

  const calcularResultado = () => {
    const contagem: Record<string,number> = {D:0,I:0,S:0,C:0};
    Object.values(respostas).forEach(r => { contagem[r]++ });
    return Object.entries(contagem).sort((a,b) => b[1]-a[1])[0][0];
  };

  const finalizar = async () => {
    if (Object.keys(respostas).length < QUESTOES.length) return;
    setLoading(true);
    const result = calcularResultado();
    const grafico = {D:0,I:0,S:0,C:0};
    Object.values(respostas).forEach(r => { grafico[r as keyof typeof grafico]++ });
    Object.keys(grafico).forEach(k => {
      grafico[k as keyof typeof grafico] = Math.round((grafico[k as keyof typeof grafico]/QUESTOES.length)*100);
    });
    await fetch("/api/portal/estudante/disc", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ resultado:result, respostas, grafico }),
    });
    setResultado(result);
    setLoading(false);
  };

  if (resultado) {
    const info = DISC_RESULT[resultado];
    return (
      <div className="max-w-lg mx-auto">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">{info.emoji}</div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">Seu Perfil DISC</h1>
          <h2 className="text-3xl font-black text-[#0f2a5e] mb-4">{resultado} — {info.nome}</h2>
          <p className="text-slate-600 text-sm mb-4 leading-relaxed">{info.desc}</p>
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Seus pontos fortes</p>
            <p className="text-sm text-slate-700">{info.pontos}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full justify-center"
              onClick={() => {
                window.open("/api/portal/estudante/disc-relatorio", "_blank");
              }}
            >
              📊 Ver Relatório Completo
            </Button>
            <Button variant="secondary" className="w-full justify-center" onClick={()=>router.push("/portal-estudante")}>
              Voltar ao Portal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progresso = Object.keys(respostas).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Teste DISC</h1>
        <p className="text-slate-500 text-sm mt-1">Descubra seu perfil profissional. {progresso}/{QUESTOES.length} respondidas.</p>
        <div className="h-2 bg-slate-100 rounded-full mt-3">
          <div className="h-2 bg-[#0f2a5e] rounded-full transition-all" style={{width:`${(progresso/QUESTOES.length)*100}%`}}/>
        </div>
      </div>

      <div className="space-y-4">
        {QUESTOES.map(q => (
          <Card key={q.id} className={`p-5 transition-all ${respostas[q.id]?"border border-emerald-200":""}`}>
            <p className="text-sm font-bold text-slate-800 mb-3">
              <span className="text-[#0f2a5e] font-black mr-2">{q.id}.</span> {q.texto}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(q.opcoes[0]).map(([tipo,texto]) => (
                <button key={tipo} onClick={()=>responder(q.id,tipo.toUpperCase())}
                  className={`p-3 text-left text-xs rounded-xl border-2 transition-all font-medium ${
                    respostas[q.id]===tipo.toUpperCase()
                      ? "border-[#0f2a5e] bg-[#0f2a5e] text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  {texto}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">{QUESTOES.length - progresso} questões restantes</p>
        <Button onClick={finalizar} disabled={progresso < QUESTOES.length || loading}
          className="px-8">
          {loading?"Calculando...":progresso<QUESTOES.length?`Responda mais ${QUESTOES.length-progresso}`:"Ver Resultado →"}
        </Button>
      </div>
    </div>
  );
}
