"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card }   from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";

const ABAS = ["Dados da Smarter","Branding","Login Visual","Documentos","Certidões IES","Email (Resend)","Assinatura Digital","Seguro"];

const TIPOS_DOC = [
  { value: "CERTIDAO",  label: "📋 Certidão" },
  { value: "CNPJ",      label: "🏢 Cartão CNPJ" },
  { value: "ALVARA",    label: "📜 Alvará" },
  { value: "CONTRATO",  label: "📄 Contrato" },
  { value: "OUTRO",     label: "📎 Outro" },
];

function diasParaVencer(vigencia: string | null): number | null {
  if (!vigencia) return null;
  return Math.ceil((new Date(vigencia).getTime() - Date.now()) / 86400000);
}

function badgeVigencia(dias: number | null) {
  if (dias === null) return null;
  if (dias < 0)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">⚠️ Vencido há {Math.abs(dias)}d</span>;
  if (dias <= 15) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">🔴 Vence em {dias}d</span>;
  if (dias <= 30) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">🟡 Vence em {dias}d</span>;
  return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✅ Válido ({dias}d)</span>;
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const isMaster = session?.user?.role === "FRANQUEADORA";

  const [aba, setAba]       = useState("Dados da Smarter");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [showAutToken, setShowAutToken] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [uploadingAssin, setUploadingAssin] = useState(false);
  const assinInputRef = useRef<HTMLInputElement>(null);
  const [cfg, setCfg]       = useState<any>({
    razaoSocial: "", cnpj: "", endereco: "", cidade: "", uf: "SP",
    telefone: "", email: "", responsavel: "", cargoResponsavel: "Diretor(a)", pix: "", apolice: "", seguradora: "",
    nomeFantasia: "Sistema Smarter", slogan: "Gestão completa de estágios",
    loginTitulo: "Sistema Smarter", loginSubtitulo: "Sistema de Gestão de Estágios",
    loginSlogan: "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
    loginLogoUrl: "", loginBgUrl: "",
    logoDocUrl: "", watermarkUrl: "", watermarkText: "SMARTER",
    assinaturaUrl: "",
    autentiqueToken: "", resendApiKey: "",
    autentiqueConectado: false, resendConectado: false,
  });
  const set = (k: string, v: string) => setCfg((p: any) => ({ ...p, [k]: v }));

  // Certidões IES
  const [docs, setDocs]           = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [novoDoc, setNovoDoc]     = useState({ nome: "", tipo: "CERTIDAO", url: "", descricao: "", vigencia: "" });
  const [savingDoc, setSavingDoc] = useState(false);
  const [msgDoc, setMsgDoc]       = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const loadDocs = () => {
    setLoadingDocs(true);
    fetch("/api/admin/ies-documentos")
      .then(r => r.json())
      .then(d => { setDocs(d.documentos || []); setLoadingDocs(false); })
      .catch(() => setLoadingDocs(false));
  };

  useEffect(() => {
    if (aba === "Certidões IES") loadDocs();
  }, [aba]);

  const uploadArquivo = async (file: File, onSuccess: (url: string) => void, setLoading: (b: boolean) => void) => {
    setLoading(true);
    const fd = new FormData();
    fd.append("arquivo", file);
    const r = await fetch("/api/app/upload-arquivo", { method: "POST", body: fd });
    const d = await r.json();
    setLoading(false);
    if (d.url) { onSuccess(d.url); }
    else { alert(d.error || "Erro ao fazer upload."); }
  };

  const salvarDoc = async () => {
    if (!novoDoc.nome.trim() || !novoDoc.url.trim()) return;
    setSavingDoc(true);
    const r = await fetch("/api/admin/ies-documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoDoc),
    });
    const d = await r.json();
    setSavingDoc(false);
    if (d.documento) {
      setDocs(prev => [d.documento, ...prev]);
      setNovoDoc({ nome: "", tipo: "CERTIDAO", url: "", descricao: "", vigencia: "" });
      setMsgDoc("Documento adicionado! ✓");
      setTimeout(() => setMsgDoc(""), 3000);
    } else {
      setMsgDoc(d.error || "Erro ao salvar.");
    }
  };

  const deletarDoc = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    await fetch(`/api/admin/ies-documentos/${id}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

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
    if (res.ok) {
      setMsg("Configurações salvas! ✓");
      // Reload to get fresh masked tokens
      const d = await fetch("/api/app/config").then(r=>r.json());
      if (d.config) setCfg((p: any) => ({ ...p, ...d.config }));
    } else { setMsg("Erro ao salvar."); }
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
            className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all " + (aba === a ? "bg-white shadow text-[#0f2a5e]" : "text-slate-500 hover:text-slate-700")}>
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
              <Input label="Nome do Sistema" value={cfg.nomeFantasia} onChange={e=>set("nomeFantasia",e.target.value)} readOnly={ReadOnly} placeholder="Sistema Smarter"/>
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
              <Input label="Título principal" value={cfg.loginTitulo} onChange={e=>set("loginTitulo",e.target.value)} readOnly={ReadOnly} placeholder="Sistema Smarter"/>
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
              </div>
              <Input label="URL da Imagem de Marca d'Água (opcional)" value={cfg.watermarkUrl} onChange={e=>set("watermarkUrl",e.target.value)} readOnly={ReadOnly} placeholder="https://seusite.com/watermark.png"/>
            </div>
          </Card>

          {/* Assinatura nos documentos */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Assinatura e Carimbo</h3>
            <p className="text-xs text-slate-400 mb-4">Imagem da assinatura do responsável — aparece na Minuta de Convênio e demais documentos oficiais.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome do Responsável" value={cfg.responsavel} onChange={e=>set("responsavel",e.target.value)} readOnly={ReadOnly} placeholder="Vinicius Miranda de Freitas Paiva"/>
                <Input label="Cargo" value={cfg.cargoResponsavel} onChange={e=>set("cargoResponsavel",e.target.value)} readOnly={ReadOnly} placeholder="Diretor(a)"/>
              </div>
              {isMaster && (
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Imagem de Assinatura / Carimbo</label>
                  <div className="flex gap-2 items-start">
                    <input ref={assinInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) uploadArquivo(f, url => set("assinaturaUrl", url), setUploadingAssin);
                      }}/>
                    <button type="button" onClick={() => assinInputRef.current?.click()}
                      disabled={uploadingAssin}
                      className="text-xs font-bold px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0f2a5e] text-slate-500 hover:text-[#0f2a5e] transition-all min-w-[130px]">
                      {uploadingAssin ? "Enviando..." : "📤 Selecionar imagem"}
                    </button>
                    {cfg.assinaturaUrl && (
                      <div className="flex-1 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                        <img src={cfg.assinaturaUrl} alt="Assinatura" className="h-14 object-contain"/>
                        {isMaster && (
                          <button onClick={() => set("assinaturaUrl", "")} className="text-xs text-red-500 hover:text-red-700 ml-auto">✕ Remover</button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">PNG com fundo transparente é o ideal. A imagem ficará salva no servidor.</p>
                </div>
              )}
              {!isMaster && cfg.assinaturaUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-400 mb-1">Assinatura atual:</p>
                  <img src={cfg.assinaturaUrl} alt="Assinatura" className="h-14 object-contain"/>
                </div>
              )}
            </div>
          </Card>

          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Config. Documentos"}</Button>}
        </div>
      )}

      {/* Certidões IES */}
      {aba === "Certidões IES" && (
        <div className="max-w-3xl space-y-5">
          {msgDoc && (
            <div className={`px-4 py-2 rounded-xl text-sm font-bold ${msgDoc.includes("✓") ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{msgDoc}</div>
          )}

          {/* Aviso de vencimentos próximos */}
          {docs.some(d => { const dias = diasParaVencer(d.vigencia); return dias !== null && dias <= 30; }) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-sm font-bold text-amber-700">⚠️ Documentos próximos do vencimento:</p>
              {docs.filter(d => { const dias = diasParaVencer(d.vigencia); return dias !== null && dias <= 30; }).map(d => (
                <p key={d.id} className="text-xs text-amber-600 mt-1">• {d.nome} — {badgeVigencia(diasParaVencer(d.vigencia))}</p>
              ))}
            </div>
          )}

          {/* Adicionar novo documento */}
          {isMaster && (
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Adicionar Documento</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nome do documento" value={novoDoc.nome} onChange={e=>setNovoDoc(p=>({...p, nome: e.target.value}))} placeholder="Ex: Certidão Negativa Federal"/>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
                    <select value={novoDoc.tipo} onChange={e=>setNovoDoc(p=>({...p, tipo: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white">
                      {TIPOS_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <Input label="Descrição (opcional)" value={novoDoc.descricao} onChange={e=>setNovoDoc(p=>({...p, descricao: e.target.value}))} placeholder="Ex: Válida para uso em convênios"/>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Data de validade (vencimento)</label>
                  <input type="date" value={novoDoc.vigencia} onChange={e=>setNovoDoc(p=>({...p, vigencia: e.target.value}))}
                    className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"/>
                  <p className="text-[10px] text-slate-400 mt-1">Você receberá alerta quando faltar 30 dias para vencer.</p>
                </div>
                {/* Upload de arquivo */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Arquivo (PDF ou imagem)</label>
                  <div className="flex gap-2 items-center">
                    <input ref={docFileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) uploadArquivo(f, url => setNovoDoc(p => ({...p, url})), setUploadingDoc);
                      }}/>
                    <button type="button" onClick={() => docFileRef.current?.click()}
                      disabled={uploadingDoc}
                      className="text-xs font-bold px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0f2a5e] text-slate-500 hover:text-[#0f2a5e] transition-all">
                      {uploadingDoc ? "Enviando..." : "📤 Selecionar arquivo"}
                    </button>
                    {novoDoc.url && (
                      <a href={novoDoc.url} target="_blank" rel="noreferrer"
                        className="text-xs text-[#0f2a5e] font-bold underline truncate max-w-[200px]">
                        ✅ Arquivo selecionado
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Ou cole a URL diretamente:</p>
                  <input type="url" value={novoDoc.url} onChange={e=>setNovoDoc(p=>({...p, url: e.target.value}))}
                    placeholder="https://..."
                    className="mt-1 w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
                </div>
                <Button onClick={salvarDoc} disabled={savingDoc || !novoDoc.nome || !novoDoc.url}>
                  {savingDoc ? "Salvando..." : "＋ Adicionar Documento"}
                </Button>
              </div>
            </Card>
          )}

          {/* Lista de documentos */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Documentos Disponíveis para as IES</h3>
            {loadingDocs ? (
              <p className="text-sm text-slate-400 text-center py-6">Carregando...</p>
            ) : docs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-slate-500 text-sm font-semibold">Nenhum documento cadastrado</p>
                <p className="text-slate-400 text-xs mt-1">Adicione certidões, CNPJ e outros documentos que as IES poderão visualizar e imprimir.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map(doc => {
                  const dias = diasParaVencer(doc.vigencia);
                  const tipoLabel = TIPOS_DOC.find(t => t.value === doc.tipo)?.label || doc.tipo;
                  return (
                    <div key={doc.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 ${dias !== null && dias <= 0 ? "border-red-200 bg-red-50" : dias !== null && dias <= 30 ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">{doc.nome}</span>
                          <span className="text-xs text-slate-400">{tipoLabel}</span>
                          {badgeVigencia(dias)}
                        </div>
                        {doc.descricao && <p className="text-xs text-slate-500 mt-0.5">{doc.descricao}</p>}
                        {doc.vigencia && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Validade: {new Date(doc.vigencia).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0f2a5e]/10 text-[#0f2a5e] hover:bg-[#0f2a5e]/20">
                          Ver
                        </a>
                        {isMaster && (
                          <button onClick={() => deletarDoc(doc.id)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-700">
            <p className="font-bold mb-1">📌 Recomendação de vigência:</p>
            <p>• <strong>Certidões Negativas</strong> — renove a cada 90 dias (validade legal)</p>
            <p>• <strong>Cartão CNPJ</strong> — sem vencimento, mas atualize sempre que houver alteração</p>
            <p>• <strong>Alvará</strong> — anual, renove conforme data de vencimento do município</p>
          </div>
        </div>
      )}

      {/* Email (Resend) */}
      {aba === "Email (Resend)" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-700">Email — Resend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Serviço de envio de emails para notificações do sistema</p>
              </div>
              <span className={"px-3 py-1 rounded-full text-xs font-bold " + (cfg.resendConectado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {cfg.resendConectado ? "✓ Conectado" : "Não configurado"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">API Key do Resend</label>
                <div className="relative">
                  <input
                    type={showResendKey ? "text" : "password"}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] font-mono pr-20"
                    value={cfg.resendApiKey}
                    onChange={e=>set("resendApiKey",e.target.value)}
                    readOnly={ReadOnly}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <button type="button" onClick={()=>setShowResendKey(!showResendKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                    {showResendKey ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
                <p><strong>Como obter sua API Key:</strong></p>
                <p>1. Acesse <strong>resend.com</strong> e crie uma conta gratuita</p>
                <p>2. Vá em <strong>API Keys → Create API Key</strong></p>
                <p>3. Cole a chave acima e salve</p>
                <p>💡 O plano gratuito inclui 3.000 emails/mês e 100/dia</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                <p><strong>Emails enviados automaticamente pelo sistema:</strong></p>
                <p className="mt-1">• Boas-vindas para novos estudantes (com senha de acesso)</p>
                <p>• Boas-vindas para empresas cadastradas</p>
                <p>• Notificação de documento para assinatura</p>
                <p>• Cobranças financeiras com PIX/boleto</p>
                <p>• Credenciais para novos colaboradores</p>
              </div>
            </div>
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Configuração de Email"}</Button>}
        </div>
      )}

      {/* Assinatura Digital (Autentique) */}
      {aba === "Assinatura Digital" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-700">Autentique — Assinatura Digital</h3>
                <p className="text-xs text-slate-400 mt-0.5">Integração para assinatura eletrônica de contratos e documentos</p>
              </div>
              <span className={"px-3 py-1 rounded-full text-xs font-bold " + (cfg.autentiqueConectado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {cfg.autentiqueConectado ? "✓ Conectado" : "Não configurado"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Token de API (Autentique)</label>
                <div className="relative">
                  <input
                    type={showAutToken ? "text" : "password"}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] font-mono pr-20"
                    value={cfg.autentiqueToken}
                    onChange={e=>set("autentiqueToken",e.target.value)}
                    readOnly={ReadOnly}
                    placeholder="Cole aqui o token de API do Autentique..."
                  />
                  <button type="button" onClick={()=>setShowAutToken(!showAutToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                    {showAutToken ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">O token é armazenado de forma segura no banco de dados.</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
                <p><strong>Como obter seu token:</strong></p>
                <p>1. Acesse <strong>app.autentique.com.br</strong> → Configurações → API</p>
                <p>2. Gere ou copie seu token de acesso</p>
                <p>3. Cole acima e salve</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <p><strong>⚠️ Importante:</strong> Se quiser trocar o provedor de assinatura no futuro, basta substituir o token aqui. O sistema irá usar automaticamente o novo provedor.</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                <p><strong>Funcionalidades habilitadas com este token:</strong></p>
                <p className="mt-1">• Envio de TCE, Aditivo, Relatório e Rescisão para assinatura digital</p>
                <p>• Notificação por email aos signatários (estudante, empresa, instituição, Smarter)</p>
                <p>• Rastreamento de status de assinatura em tempo real</p>
                <p>• Links individuais para cada parte assinar</p>
              </div>
            </div>
          </Card>
          {isMaster && <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Token de Assinatura"}</Button>}
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
