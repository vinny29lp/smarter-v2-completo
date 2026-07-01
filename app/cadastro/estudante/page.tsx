"use client";

export const dynamic = "force-dynamic";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const STEPS = ["Dados Pessoais","Endereço","Formação","Currículo","Acesso"];
function CadastroContent() {
  const params = useSearchParams();
  const ref = params.get("ref") || "";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{email:string;senha:string}|null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    // Pessoal
    nome:"", cpf:"", rg:"", dataNasc:"", sexo:"F", email:"", celular:"", telefone:"",
    // Endereço
    endereco:"", bairro:"", cidade:"", uf:"", cep:"",
    // Formação
    institutionNome:"", curso:"", periodo:"1", semestre:"",
    previsaoConclusao:"", turno:"Matutino",
    // Currículo
    objetivos:"", habilidades:"", idiomas:"", linkedin:"", portfolio:"",
    experiencias:"",
    // Disponibilidade
    disponibilidade:"Manhã", turnoDisp:"Integral",
    // discResult removido - gerado pelo teste DISC no portal
  });

  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!form.nome||!form.email||!form.curso) { setError("Preencha: Nome, E-mail e Curso."); return; }
    setLoading(true); setError("");
    try {
      const habilidadesList = form.habilidades.split(",").map(h=>h.trim()).filter(Boolean);
      const res = await fetch("/api/public/estudante", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          ...form,
          habilidades: habilidadesList,
          franchiseRef: ref,
          experiencias: form.experiencias ? [{ descricao: form.experiencias }] : [],
          idiomas: form.idiomas ? form.idiomas.split(",").map(i=>({idioma:i.trim()})) : [],
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { /* resposta não-JSON — tratar como erro */ }
      if (!res.ok || data.error) {
        setError(data.error || "Erro ao realizar cadastro. Tente novamente.");
        return;
      }
      setDone({ email: data.email || form.email, senha: data.senha || "" });
    } catch (e: any) {
      setError("Falha na conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🎓</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Cadastro Realizado!</h2>
        <p className="text-slate-500 text-sm mb-4">Seu perfil foi criado. Acesse o portal para acompanhar vagas e estágios.</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-4">
          <p className="text-xs font-bold text-slate-400 mb-2">SEUS DADOS DE ACESSO:</p>
          <p className="text-sm"><strong>Login:</strong> {done.email}</p>
          {done.senha
            ? <>
                <p className="text-sm"><strong>Senha:</strong> {done.senha}</p>
                <p className="text-xs text-red-500 mt-2">⚠️ Guarde sua senha agora — ela não será exibida novamente.</p>
              </>
            : <p className="text-sm text-slate-600 mt-1">📧 Sua senha foi enviada para <strong>{done.email}</strong>. Verifique sua caixa de entrada (e o spam).</p>
          }
        </div>
        <a href="/login" className="block w-full text-center bg-[#0f2a5e] text-white py-3 rounded-xl font-bold hover:bg-[#1a3d8f] transition-colors">
          Acessar o Portal →
        </a>
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
          <h1 className="text-2xl font-black text-white">Cadastro de Estudante</h1>
          <p className="text-white/70 text-sm mt-1">Crie seu perfil e encontre oportunidades de estágio</p>
          <a
            href="/login"
            className="inline-block mt-3 px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors"
          >
            Já tenho cadastro → Acessar o sistema
          </a>
        </div>

        {/* Steps */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((l,i) => (
            <div key={i} className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg ${step===i+1?"bg-[#f5c400] text-[#0f2a5e]":step>i+1?"bg-white/20 text-white":"bg-white/10 text-white/40"}`}>
              {i+1}. {l}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {/* STEP 1: Dados Pessoais */}
          {step===1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Nome Completo *" value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ana Lima"/></div>
              <Input label="CPF" value={form.cpf} onChange={e=>set("cpf",e.target.value)} placeholder="000.000.000-00"/>
              <Input label="RG" value={form.rg} onChange={e=>set("rg",e.target.value)} placeholder="00.000.000-0"/>
              <Input label="Data de Nascimento" type="date" value={form.dataNasc} onChange={e=>set("dataNasc",e.target.value)}/>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sexo</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.sexo} onChange={e=>set("sexo",e.target.value)}>
                  <option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option>
                </select>
              </div>
              <div className="col-span-2"><Input label="E-mail *" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="ana@email.com"/></div>
              <Input label="Celular *" value={form.celular} onChange={e=>set("celular",e.target.value)} placeholder="(11) 98888-1111"/>
              <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 3333-0000"/>
            </div>
          )}

          {/* STEP 2: Endereço */}
          {step===2 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Rua das Flores, 100"/></div>
              <Input label="Bairro" value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Jardim Paulista"/>
              <Input label="Cidade *" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
              <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP"/>
              <Input label="CEP" value={form.cep} onChange={e=>set("cep",e.target.value)} placeholder="01310-000"/>
            </div>
          )}

          {/* STEP 3: Formação */}
          {step===3 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Instituição de Ensino *" value={form.institutionNome} onChange={e=>set("institutionNome",e.target.value)} placeholder="USP, FATEC, SENAC..."/></div>
              <div className="col-span-2"><Input label="Curso *" value={form.curso} onChange={e=>set("curso",e.target.value)} placeholder="Administração de Empresas"/></div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Período</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.periodo} onChange={e=>set("periodo",e.target.value)}>
                  {["1","2","3","4","5","6","7","8","9","10"].map(p=><option key={p} value={p}>{p}º</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Turno</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.turno} onChange={e=>set("turno",e.target.value)}>
                  {["Matutino","Vespertino","Noturno","EAD"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Input label="Previsão de Conclusão" value={form.previsaoConclusao} onChange={e=>set("previsaoConclusao",e.target.value)} placeholder="Julho/2026"/></div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Disponibilidade</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.disponibilidade} onChange={e=>set("disponibilidade",e.target.value)}>
                  {["Manhã","Tarde","Integral"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Currículo */}
          {step===4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Objetivo Profissional</label>
                <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none" value={form.objetivos} onChange={e=>set("objetivos",e.target.value)} placeholder="Descreva seu objetivo profissional e área de interesse..."/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Habilidades (separadas por vírgula)</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]" value={form.habilidades} onChange={e=>set("habilidades",e.target.value)} placeholder="Excel, Word, Atendimento ao cliente, Comunicação..."/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Idiomas (separados por vírgula)</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]" value={form.idiomas} onChange={e=>set("idiomas",e.target.value)} placeholder="Inglês básico, Espanhol intermediário..."/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Experiências Anteriores</label>
                <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none" value={form.experiencias} onChange={e=>set("experiencias",e.target.value)} placeholder="Descreva suas experiências profissionais, voluntariado, projetos..."/>
              </div>
              <Input label="LinkedIn (opcional)" value={form.linkedin} onChange={e=>set("linkedin",e.target.value)} placeholder="linkedin.com/in/seuusuario"/>
              <Input label="Portfólio / GitHub (opcional)" value={form.portfolio} onChange={e=>set("portfolio",e.target.value)} placeholder="github.com/seuusuario"/>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                🧠 Seu perfil DISC será identificado após o acesso ao portal, através do teste oficial.
              </div>
            </div>
          )}

          {/* STEP 5: Acesso */}
          {step===5 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm font-bold text-blue-800 mb-2">Suas credenciais de acesso</p>
                <p className="text-sm text-blue-700">E-mail: <strong>{form.email}</strong></p>
                <p className="text-sm text-blue-700">Uma senha será gerada automaticamente ao finalizar.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <p className="font-bold text-slate-700 mb-2">Resumo do seu perfil:</p>
                <p><strong>Nome:</strong> {form.nome}</p>
                <p><strong>Curso:</strong> {form.curso} — {form.periodo}º período</p>
                <p><strong>Instituição:</strong> {form.institutionNome}</p>
                <p><strong>Cidade:</strong> {form.cidade}/{form.uf}</p>

              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                ✅ Após finalizar, você receberá suas credenciais e poderá acessar o portal de estudantes.
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            {step>1 && <Button variant="secondary" onClick={()=>{setError("");setStep(p=>p-1);}}>← Voltar</Button>}
            {step<5
              ? <Button className="flex-1 justify-center" onClick={()=>{setError("");setStep(p=>p+1);}}>Próximo →</Button>
              : <Button className="flex-1 justify-center" onClick={handleSubmit} disabled={loading}>{loading?"Finalizando...":"Finalizar Cadastro ✓"}</Button>
            }
          </div>
        </Card>
        <p className="text-white/40 text-xs text-center mt-4">Sistema Smarter — Sistema de Gestão de Estágios</p>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <Suspense fallback={null}>
      <CadastroContent />
    </Suspense>
  );
}
