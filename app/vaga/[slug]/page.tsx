"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function VagaPublicaPage() {
  const params = useParams();
  const [vaga, setVaga] = useState<any>(null);
  const [modo, setModo] = useState<"ver"|"login"|"cadastro">("ver");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [curso, setCurso] = useState("");

  useEffect(()=>{
    fetch(`/api/public/vaga/${params.slug}`)
      .then(r=>r.json()).then(d=>setVaga(d.vaga));
  },[params.slug]);

  const inscreverComLogin = async () => {
    setLoading(true); setMsg("");
    const res = await fetch("/api/public/vaga/inscrever", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, senha, vagaId: vaga?.id }),
    });
    const data = await res.json();
    if (data.error) { setMsg(data.error); } else { setDone(true); }
    setLoading(false);
  };

  const inscreverComCadastro = async () => {
    if (!nome||!email||!curso) { setMsg("Preencha nome, e-mail e curso."); return; }
    setLoading(true); setMsg("");
    // Criar estudante e já inscrever
    const res = await fetch("/api/public/vaga/inscrever-novo", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nome, email, senha, curso, vagaId: vaga?.id, franchiseId: vaga?.franchiseId }),
    });
    const data = await res.json();
    if (data.error) { setMsg(data.error); } else { setDone(true); }
    setLoading(false);
  };

  if (!vaga) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center">
      <p className="text-white">Carregando...</p>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black mb-2">Inscrição Realizada!</h2>
        <p className="text-slate-500 text-sm">Você está inscrito na vaga <strong>{vaga.titulo}</strong>. A empresa entrará em contato em breve.</p>
        <a href="/login" className="block mt-4 text-blue-500 hover:underline text-sm">Acessar o portal →</a>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-sm mb-3">
            <span className="font-black text-[#f5c400]">S</span> Sistema Smarter
          </div>
          <h1 className="text-2xl font-black text-white">{vaga.titulo}</h1>
          <p className="text-white/70 mt-1">{vaga.company?.name} • {vaga.cidade}/{vaga.uf}</p>
        </div>

        {modo === "ver" && (
          <>
            <Card className="p-6 mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  ["💰 Bolsa","R$ "+vaga.bolsa?.toLocaleString("pt-BR")+"/mês"],
                  ["⏱ Jornada",vaga.cargaHoraria+"h/semana"],
                  ["🏢 Modalidade",vaga.modalidade],
                  ["📍 Local",vaga.cidade+"/"+vaga.uf],
                ].map(([l,v])=>(
                  <div key={l} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-400">{l}</p>
                    <p className="text-sm font-bold">{v}</p>
                  </div>
                ))}
              </div>
              {vaga.descricao && <><p className="text-xs font-bold text-slate-500 mb-2">Sobre a vaga</p><p className="text-sm text-slate-600 mb-4">{vaga.descricao}</p></>}
              {vaga.requisitos && <><p className="text-xs font-bold text-slate-500 mb-2">Requisitos</p><p className="text-sm text-slate-600">{vaga.requisitos}</p></>}
            </Card>

            {vaga.status === "ABERTA" ? (
              <Card className="p-6">
                <h3 className="text-sm font-bold mb-3">Candidatar-se a esta vaga</h3>
                <div className="flex gap-3">
                  <Button className="flex-1 justify-center" onClick={()=>setModo("login")}>
                    Já tenho cadastro
                  </Button>
                  <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModo("cadastro")}>
                    Quero me cadastrar
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-slate-500">Esta vaga não está aceitando inscrições no momento.</Card>
            )}
          </>
        )}

        {modo === "login" && (
          <Card className="p-6">
            <h3 className="text-sm font-bold mb-1">Entrar com meu cadastro</h3>
            <p className="text-xs text-slate-400 mb-4">Use o e-mail e senha do seu portal de estágios</p>
            {msg && <p className="text-red-500 text-sm mb-3">{msg}</p>}
            <div className="space-y-3">
              <Input label="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
              <Input label="Senha" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" onClick={()=>setModo("ver")}>← Voltar</Button>
                <Button className="flex-1 justify-center" onClick={inscreverComLogin} disabled={loading}>{loading?"Inscrevendo...":"Confirmar Inscrição"}</Button>
              </div>
            </div>
          </Card>
        )}

        {modo === "cadastro" && (
          <Card className="p-6">
            <h3 className="text-sm font-bold mb-1">Cadastro rápido e inscrição</h3>
            <p className="text-xs text-slate-400 mb-4">Preencha os dados básicos para se inscrever</p>
            {msg && <p className="text-red-500 text-sm mb-3">{msg}</p>}
            <div className="space-y-3">
              <Input label="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ana Lima"/>
              <Input label="E-mail *" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ana@email.com"/>
              <Input label="Curso *" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Administração"/>
              <Input label="Criar senha *" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 6 caracteres"/>
              <p className="text-xs text-slate-400">Após o cadastro você poderá completar seu perfil no portal.</p>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" onClick={()=>setModo("ver")}>← Voltar</Button>
                <Button className="flex-1 justify-center" onClick={inscreverComCadastro} disabled={loading}>{loading?"Cadastrando...":"Cadastrar e Inscrever"}</Button>
              </div>
            </div>
          </Card>
        )}
        <p className="text-white/30 text-xs text-center mt-4">Sistema Smarter</p>
      </div>
    </div>
  );
}
