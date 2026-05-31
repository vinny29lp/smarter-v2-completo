"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card }   from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";

const ABAS = ["Dados da Smarter","Branding","Login Visual","Documentos","SMTP","Authentique","Seguro"];

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const isMaster = session?.user?.role === "FRANQUEADORA";

  const [aba, setAba]       = useState("Dados da Smarter");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [cfg, setCfg]       = useState<any>({
    razaoSocial: "", cnpj: "", endereco: "", cidade: "", uf: "SP",
    telefone: "", email: "", responsavel: "", pix: "", apolice: "", seguradora: "",
    nomeFantasia: "Smarter Estágios", slogan: "Gestão completa de estágios",
    loginTitulo: "Smarter Estágios", loginSubtitulo: "Sistema de Gestão de Estágios",
    loginSlogan: "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
    loginLogoUrl: "", loginBgUrl: "",
    logoDocUrl: "", watermarkUrl: "", watermarkText: "SMARTER",
  });
  const set = (k: string, v: string) => setCfg((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/app/config")
      .then(r => r.json())
      .then(d => { if (d.config) setCfg((p: any) => ({ ...p, ...d.config })); });
  }, []);

  const save = async () => {
    if (!isMaster) return;
    setSaving(true);
    const res = await fetch("/api/app/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (res.ok) { setMsg("Configurações salvas! ✓"); }
    else { setMsg("Erro ao salvar."); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const ReadOnly = !isMaster;

  return (
    <div>
      {msg && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">{msg}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isMaster ? "Dados do sistema, branding e integrações" : "Somente a Franqueadora pode editar estas configurações."}
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 flex-wrap">
        {ABAS.map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${aba === a ? "bg-white shadow text-[#0f2a5e]" : "text-slate-500 hover:text-slate-700"}`}>
            {a}
          </button>
        ))}
      </div>

      {/* Dados da Smarter */}
      {aba === "Dados da Smarter" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Dados da Empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Razão Social" value={cfg.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)} readOnly={ReadOnly}/></div>
              <Input label="CNPJ" value={cfg.cnpj} onChange={e=>set("cnpj",e.target.value)} readOnly={ReadOnly}/>
              <Input label="Chave PIX" value={cfg.pix} onChange={e=>set("pix",e.target.value)} readOnly={ReadOnly}/>
              <div className="col-span-2"><Input label="Endereço" value={cfg.endereco} onChange={e=>set("endereco",e.target.value)} readOnly={ReadOnly}/></div>
              <Input label="Cidade" value={cfg.cidade} onChange={e=>set("cidade",e.target.value)} readOnly={ReadOnly}/>
              <Input label="UF" value={cfg.uf} onChange={e=>set("uf",e.target.value)} readOnly={ReadOnly}/>
              <Input label="Telefone" value={cfg.telefone} onChange={e=>set("telefone",e.target.value)} readOnly={ReadOnly}/>
              <Input label="E-mail" value={cfg.email} onChange={e=>set("email",e.target.value)} readOnly={ReadOnly}/>
              <div className="col-span-2"><Input label="Responsável Legal" value={cfg.responsavel} onChange={e=>set("responsavel",e.target.value)} readOnly={ReadOnly}/></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Seguro de Vida Padrão</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nº da Apólice" value={cfg.apolice} onChange={e=>set("apolice",e.target.value)} readOnly={ReadOnly}/>
              <Input label="Seguradora" value={cfg.seguradora} onChange={e=>set("seguradora",e.target.value)} readOnly={ReadOnly}/>
            </div>
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Configurações"}</Button>}
        </div>
      )}

      {/* Branding */}
      {aba === "Branding" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Identidade do Sistema</h3>
            <p className="text-xs text-slate-400 mb-4">Esses dados aparecem no sidebar, header e documentos.</p>
            <div className="space-y-3">
              <Input label="Nome do Sistema" value={cfg.nomeFantasia} onChange={e=>set("nomeFantasia",e.target.value)} readOnly={ReadOnly} placeholder="Smarter Estágios"/>
              <Input label="Slogan / Frase curta" value={cfg.slogan} onChange={e=>set("slogan",e.target.value)} readOnly={ReadOnly} placeholder="Gestão completa de estágios"/>
            </div>
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Branding"}</Button>}
        </div>
      )}

      {/* Login Visual */}
      {aba === "Login Visual" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Tela de Login</h3>
            <p className="text-xs text-slate-400 mb-4">Personalize o visual da tela de acesso ao sistema.</p>
            <div className="space-y-3">
              <Input label="Título principal" value={cfg.loginTitulo} onChange={e=>set("loginTitulo",e.target.value)} readOnly={ReadOnly} placeholder="Smarter Estágios"/>
              <Input label="Subtítulo" value={cfg.loginSubtitulo} onChange={e=>set("loginSubtitulo",e.target.value)} readOnly={ReadOnly} placeholder="Sistema de Gestão de Estágios"/>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Slogan / Texto de apoio</label>
                <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none"
                  value={cfg.loginSlogan} onChange={e=>set("loginSlogan",e.target.value)} readOnly={ReadOnly}
                  placeholder="Plataforma completa para..."/>
              </div>
              <Input label="URL da Logo (https://...)" value={cfg.loginLogoUrl} onChange={e=>set("loginLogoUrl",e.target.value)} readOnly={ReadOnly} placeholder="https://seusite.com/logo.png"/>
              <Input label="URL da Imagem de Fundo (https://...)" value={cfg.loginBgUrl} onChange={e=>set("loginBgUrl",e.target.value)} readOnly={ReadOnly} placeholder="https://seusite.com/bg.jpg"/>
            </div>
            {(cfg.loginLogoUrl || cfg.loginBgUrl) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                ℹ️ Use URLs públicas (Cloudinary, ImgBB, GitHub raw, etc.). Suporte a PNG, JPG, SVG, WebP.
              </div>
            )}
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Visual do Login"}</Button>}
        </div>
      )}

      {/* Documentos */}
      {aba === "Documentos" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Logo e Marca d'Água</h3>
            <p className="text-xs text-slate-400 mb-4">Esses elementos aparecem em todos os documentos e contratos gerados.</p>
            <div className="space-y-3">
              <Input label="URL da Logo para Documentos" value={cfg.logoDocUrl} onChange={e=>set("logoDocUrl",e.target.value)} readOnly={ReadOnly} placeholder="https://seusite.com/logo-doc.png"/>
              {cfg.logoDocUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-400 mb-1">Prévia:</p>
                  <img src={cfg.logoDocUrl} alt="preview logo" className="h-10 object-contain"/>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3">
                <Input label="Texto da Marca d'Água" value={cfg.watermarkText} onChange={e=>set("watermarkText",e.target.value)} readOnly={ReadOnly} placeholder="SMARTER"/>
                <p className="text-[10px] text-slate-400 mt-1">Aparece diagonalmente ao fundo de cada página dos documentos.</p>
              </div>
              <Input label="URL da Imagem de Marca d'Água (opcional)" value={cfg.watermarkUrl} onChange={e=>set("watermarkUrl",e.target.value)} readOnly={ReadOnly} placeholder="https://seusite.com/watermark.png"/>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              ⚠️ Alterações aqui afetam documentos gerados a partir de agora. Documentos já gerados não são alterados.
            </div>
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Config. Documentos"}</Button>}
        </div>
      )}

      {/* SMTP - mantido sem alteração funcional */}
      {aba === "SMTP" && (
        <div className="max-w-2xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Configuração de E-mail</h3>
            <p className="text-xs text-slate-400 mb-4">Configure o servidor SMTP para envio de notificações.</p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              ⚠️ As configurações SMTP precisam ser definidas no arquivo <code className="font-mono bg-amber-100 px-1 rounded">.env</code> do servidor.
            </div>
          </Card>
        </div>
      )}

      {/* Authentique */}
      {aba === "Authentique" && (
        <div className="max-w-2xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Authentique — Assinatura Digital</h3>
            <p className="text-xs text-slate-400 mb-4">Configure sua chave de API para habilitar assinaturas digitais reais.</p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              Acesse <strong>app.authentique.com.br</strong> → Configurações → API para obter sua chave.
            </div>
          </Card>
        </div>
      )}

      {/* Seguro */}
      {aba === "Seguro" && (
        <div className="max-w-2xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Seguro de Vida — Lei 11.788/2008</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nº da Apólice" value={cfg.apolice} onChange={e=>set("apolice",e.target.value)} readOnly={ReadOnly}/>
              <Input label="Seguradora" value={cfg.seguradora} onChange={e=>set("seguradora",e.target.value)} readOnly={ReadOnly}/>
            </div>
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              ✅ Esta apólice será preenchida automaticamente em todos os documentos TCE gerados.
            </div>
            {isMaster && <Button className="mt-4" onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar"}</Button>}
          </Card>
        </div>
      )}
    </div>
  );
}
