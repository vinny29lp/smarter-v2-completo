/**
 * Cliente HTTP da integração interna Smarter ⇄ AlizoAI (API de parceiro v1).
 * Só fala HTTP com a Alizo — nunca acessa código/banco dela. A chave vem de ALIZO_PARTNER_API_KEY
 * e NUNCA é gravada em código, teste ou log. Sem chave configurada, `criarAlizoClient()` devolve null
 * e os chamadores fazem no-op.
 */
export class AlizoError extends Error {
  constructor(public status: number, message: string, public retryAfterMs?: number) {
    super(message);
    this.name = "AlizoError";
  }
  /** 401/403: token ou permissão incorretos — alerta administrativo, nunca retentar. */
  get ehAutenticacao() { return this.status === 401 || this.status === 403; }
  /** Falha temporária (rede, 429, 5xx): pode tentar de novo depois. */
  get ehTemporario() { return this.status === 0 || this.status === 429 || this.status >= 500; }
}

/** Mensagem segura, em português, para mostrar ao usuário (sem detalhes técnicos nem segredos). */
export function mensagemAmigavel(e: unknown): string {
  if (!(e instanceof AlizoError)) return "Erro inesperado ao falar com os funcionários digitais.";
  if (e.ehAutenticacao) return "Configuração administrativa necessária: o acesso à Alizo precisa ser revisado.";
  if (e.status === 409) return e.message || "Conflito: a operação não pôde ser concluída agora.";
  if (e.status === 404) return "Vínculo não encontrado na Alizo. Peça uma nova sincronização.";
  if (e.status === 400) return e.message || "Dados inválidos para a Alizo.";
  if (e.ehTemporario) return "A Alizo está indisponível no momento. Tentaremos novamente automaticamente.";
  return e.message || "Erro ao falar com a Alizo.";
}

export interface AlizoOpcoes {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  maxTentativas?: number;
}

export interface AlizoUnidadeApi {
  id: string; name: string; slug?: string; city?: string | null; state?: string | null; external_id?: string | null;
  whatsapp_phone?: string | null; timezone?: string; active?: boolean; is_active?: boolean; status?: string; template_version?: string | number | null;
}

/** Estado do WhatsApp: a Alizo só é confiável quando devolve `connected` — QR lido não basta. */
export interface AlizoWhatsapp {
  status?: string; connected?: boolean; qr_code?: string | null; qr?: string | null; expires_at?: string | null;
  phone?: string | null; whatsapp_phone?: string | null; provider?: string | null; last_activity_at?: string | null;
}

export interface AlizoLead {
  id: string; unit_id: string; name: string; company_name: string | null; phone: string | null; email: string | null;
  source: string | null; external_id: string | null; status: string; notes: string | null;
  last_contacted_at: string | null; deal_closed_at: string | null; created_at: string; updated_at: string;
}

/** Só dígitos; 10–11 dígitos (DDD+número BR) ganham DDI 55. Devolve null se inválido. */
export function normalizarTelefone(t: string | null | undefined): string | null {
  let d = String(t || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

/** Máscara para log: nunca registrar telefone completo. */
export function mascararTelefone(t: string | null | undefined): string {
  const d = String(t || "").replace(/\D/g, "");
  return d.length <= 4 ? "****" : `${"*".repeat(d.length - 4)}${d.slice(-4)}`;
}

export class AlizoClient {
  private base: string;
  private key: string;
  private f: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private timeoutMs: number;
  private maxTentativas: number;

  constructor(o: AlizoOpcoes) {
    this.base = o.baseUrl.replace(/\/$/, "") + "/api/partner/v1";
    this.key = o.apiKey;
    this.f = o.fetchImpl || fetch;
    this.sleep = o.sleep || (ms => new Promise(r => setTimeout(r, ms)));
    this.timeoutMs = o.timeoutMs ?? 10_000;
    this.maxTentativas = o.maxTentativas ?? 3;
  }

  private async req<T>(metodo: string, caminho: string, corpo?: unknown, headers: Record<string, string> = {}): Promise<T> {
    let ultimo: AlizoError | null = null;
    for (let tentativa = 1; tentativa <= this.maxTentativas; tentativa++) {
      try {
        const res = await this.f(this.base + caminho, {
          method: metodo,
          headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...headers },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        const texto = await res.text();
        let json: any = null;
        try { json = texto ? JSON.parse(texto) : null; } catch { /* corpo não-JSON */ }
        if (res.ok) return json as T;
        const ra = Number(res.headers.get("retry-after"));
        const erro = new AlizoError(res.status, json?.error || `Erro ${res.status} na Alizo`, Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined);
        // Retry só em 429/5xx — nunca em 4xx de negócio/autorização.
        if (res.status === 429 || res.status >= 500) { ultimo = erro; }
        else throw erro;
      } catch (e: any) {
        if (e instanceof AlizoError && e.status < 500 && e.status !== 429) throw e;
        ultimo = e instanceof AlizoError ? e : new AlizoError(0, "Falha de rede ou timeout ao falar com a Alizo");
      }
      if (tentativa < this.maxTentativas) {
        // 429: respeita Retry-After (limitado a 10 s por tentativa para caber na função serverless).
        const espera = ultimo?.status === 429 && ultimo.retryAfterMs ? Math.min(ultimo.retryAfterMs, 10_000) : 500 * 2 ** (tentativa - 1);
        await this.sleep(espera);
      }
    }
    console.error(`[alizo] ${metodo} ${caminho} falhou após ${this.maxTentativas} tentativas: ${ultimo?.status}`);
    throw ultimo!;
  }

  // ── Unidades ──
  units() { return this.req<{ units: Array<{ id: string; slug: string; name: string; city: string; state: string; whatsapp_phone: string | null; timezone: string; external_id?: string | null }> }>("GET", "/units"); }

  /** Criação idempotente de unidade (pedido à Alizo — docs/pedido-alizo-unidades-whatsapp.md). Enquanto o endpoint não existir, a Alizo responde 404/405. */
  criarUnidade(p: { external_id: string; name: string; city?: string; state?: string; timezone?: string; contact_email?: string; contact_phone?: string; owner_name?: string; address?: string | Record<string, string> }) {
    return this.req<{ duplicate?: boolean; unit: { id: string; name?: string } }>("POST", "/units", p);
  }

  // ── Leads / Sales Rep ──
  async criarLead(p: {
    unit_id?: string; unit_slug?: string; name: string; phone: string; email?: string; source?: string;
    notes?: string; external_id?: string; first_contact?: boolean;
  }) {
    const phone = normalizarTelefone(p.phone);
    if (!phone) throw new AlizoError(400, "Telefone inválido para a Alizo (use DDI+DDD+número).");
    return this.req<{ ok: boolean; duplicate: boolean; contacted?: boolean; lead: AlizoLead }>("POST", "/leads", { ...p, phone });
  }
  listarLeads(q: { unit_id?: string; status?: string; updated_since?: string; before?: string; limit?: number } = {}) {
    return this.req<{ leads: AlizoLead[]; next_before: string | null }>("GET", "/leads" + qs(q));
  }
  lead(id: string) { return this.req<{ lead: AlizoLead }>("GET", `/leads/${encodeURIComponent(id)}`); }
  mensagens(id: string, q: { before?: string; limit?: number } = {}) {
    return this.req<{ messages: Array<{ id: string; lead_id: string; channel: string; direction: "inbound" | "outbound"; content: string; status: string; sent_at: string }>; next_before: string | null }>(
      "GET", `/leads/${encodeURIComponent(id)}/messages` + qs(q));
  }
  async enviarMensagem(id: string, text: string, idempotencyKey: string) {
    if (!idempotencyKey) throw new AlizoError(400, "Idempotency-Key é obrigatório para enviar mensagem.");
    if (text.length > 2000) throw new AlizoError(400, "Mensagem acima de 2000 caracteres.");
    return this.req<{ ok: boolean; duplicate: boolean; channels: Array<{ channel: string; ok: boolean }> }>(
      "POST", `/leads/${encodeURIComponent(id)}/messages`, { text }, { "Idempotency-Key": idempotencyKey });
  }

  // ── Google Maps ──
  salvarPerfilProspeccao(p: { unit_id: string; mode: "business_types" | "general"; business_types?: string[]; region?: string; general_sector?: string | null; headcount_range?: string }) {
    return this.req<any>("PUT", "/prospecting/profile", p);
  }
  perfilProspeccao(unit_id: string) { return this.req<any>("GET", "/prospecting/profile" + qs({ unit_id })); }
  /** first_contact:false = só captura; o 1º contato é o e-mail da Lia e depois o contato humano do franqueado (nunca WhatsApp automático). */
  rodarProspeccao(unit_id: string, limit = 15) { return this.req<{ ok: boolean; captured: number; contacted: number; skipped?: number; leads?: any[] }>("POST", "/prospecting/run", { unit_id, limit, first_contact: false }); }

  // ── Recrutador ──
  criarVaga(p: { unit_id: string; title: string; lead_id?: string; urgency?: string; hiring_deadline?: string; target_shortlist_size?: number; profile?: Record<string, unknown> }) {
    return this.req<{ job: { id: string; public_application_url?: string; status?: string } }>("POST", "/jobs", p);
  }
  listarVagas(q: { unit_id?: string; status?: string; limit?: number } = {}) { return this.req<{ jobs: any[] }>("GET", "/jobs" + qs(q)); }
  vaga(id: string) { return this.req<{ job: any }>("GET", `/jobs/${encodeURIComponent(id)}`); }
  candidatosDaVaga(id: string) { return this.req<{ candidates: any[] }>("GET", `/jobs/${encodeURIComponent(id)}/candidates`); }
  async adicionarCandidato(jobId: string, p: { name: string; email?: string; phone?: string; notes?: string; resume_url?: string; consent: true }) {
    if (p.consent !== true) throw new AlizoError(400, "Candidato sem consentimento registrado não pode ser enviado.");
    return this.req<any>("POST", `/jobs/${encodeURIComponent(jobId)}/candidates`, p);
  }


  // ── Unidades: consulta/atualização/situação ──
  unidadePorExternalId(externalId: string) {
    return this.req<{ units: Array<AlizoUnidadeApi> }>("GET", "/units" + qs({ external_id: externalId }));
  }
  atualizarUnidade(alizoUnitId: string, p: Record<string, unknown>) { return this.req<{ unit: AlizoUnidadeApi }>("PUT", `/units/${encodeURIComponent(alizoUnitId)}`, p); }
  desativarUnidade(alizoUnitId: string) { return this.req<any>("POST", `/units/${encodeURIComponent(alizoUnitId)}/deactivate`, {}); }
  reativarUnidade(alizoUnitId: string) { return this.req<any>("POST", `/units/${encodeURIComponent(alizoUnitId)}/reactivate`, {}); }
  sincronizarModeloUnidade(alizoUnitId: string) { return this.req<any>("POST", `/units/${encodeURIComponent(alizoUnitId)}/template/sync`, {}); }

  // ── WhatsApp ──
  whatsappStatus(alizoUnitId: string) { return this.req<AlizoWhatsapp>("GET", `/units/${encodeURIComponent(alizoUnitId)}/whatsapp`); }
  whatsappConectar(alizoUnitId: string) { return this.req<AlizoWhatsapp>("POST", `/units/${encodeURIComponent(alizoUnitId)}/whatsapp/connect`, {}); }
  whatsappReconectar(alizoUnitId: string) { return this.req<AlizoWhatsapp>("POST", `/units/${encodeURIComponent(alizoUnitId)}/whatsapp/reconnect`, {}); }
  whatsappDesconectar(alizoUnitId: string) { return this.req<AlizoWhatsapp>("POST", `/units/${encodeURIComponent(alizoUnitId)}/whatsapp/disconnect`, {}); }

  // ── Leads: edição, exclusão (LGPD), pausa/retomada, opt-out ──
  atualizarLead(id: string, p: Record<string, unknown>) { return this.req<{ lead: AlizoLead }>("PATCH", `/leads/${encodeURIComponent(id)}`, p); }
  excluirLead(id: string) { return this.req<any>("DELETE", `/leads/${encodeURIComponent(id)}`); }
  pausarLead(id: string) { return this.req<any>("POST", `/leads/${encodeURIComponent(id)}/pause`, {}); }
  retomarLead(id: string) { return this.req<any>("POST", `/leads/${encodeURIComponent(id)}/resume`, {}); }
  listarOptouts(q: { unit_id?: string; limit?: number } = {}) { return this.req<any>("GET", "/optouts" + qs(q)); }
  registrarOptout(p: { unit_id?: string; phone?: string; email?: string; reason?: string }) { return this.req<any>("POST", "/optouts", p); }

  // ── Prospecção: histórico ──
  execucoesProspeccao(q: { unit_id?: string; limit?: number } = {}) { return this.req<any>("GET", "/prospecting/runs" + qs(q)); }

  // ── Recrutamento: edição, exclusão, abordagem ──
  atualizarVaga(id: string, p: Record<string, unknown>) { return this.req<any>("PATCH", `/jobs/${encodeURIComponent(id)}`, p); }
  excluirVaga(id: string) { return this.req<any>("DELETE", `/jobs/${encodeURIComponent(id)}`); }
  abordarCandidatos(id: string, p: Record<string, unknown>) { return this.req<any>("POST", `/jobs/${encodeURIComponent(id)}/outreach`, p); }

  // ── Métricas, consumo, modelos ──
  metricas(alizoUnitId: string, q: { from?: string; to?: string } = {}) { return this.req<any>("GET", `/units/${encodeURIComponent(alizoUnitId)}/metrics` + qs(q)); }
  consumo(q: { unit_id?: string; from?: string; to?: string } = {}) { return this.req<any>("GET", "/usage" + qs(q)); }
  agenteSales(alizoUnitId: string) { return this.req<any>("GET", `/units/${encodeURIComponent(alizoUnitId)}/agents/sales`); }
  salvarAgenteSales(alizoUnitId: string, p: Record<string, unknown>) { return this.req<any>("PUT", `/units/${encodeURIComponent(alizoUnitId)}/agents/sales`, p); }
  modelo() { return this.req<any>("GET", "/template"); }
  salvarModelo(p: Record<string, unknown>) { return this.req<any>("PUT", "/template", p); }

  // ── Webhooks: replay ──
  reenviarWebhook(id: string, sinceIso: string) { return this.req<any>("POST", `/webhooks/${encodeURIComponent(id)}/replay${qs({ since: sinceIso })}`, {}); }

  // ── Eventos / webhooks ──
  criarWebhook(url: string, events: string[] = ["*"]) { return this.req<{ webhook: { id: string }; secret: string }>("POST", "/webhooks", { url, events }); }
  listarWebhooks() { return this.req<{ webhooks: any[] }>("GET", "/webhooks"); }
  removerWebhook(id: string) { return this.req<any>("DELETE", `/webhooks/${encodeURIComponent(id)}`); }
  eventos(q: { since?: string; before?: string; type?: string; limit?: number } = {}) {
    return this.req<{ events: Array<{ id: string; type: string; unit_id: string; data: any; created_at: string }>; next_before: string | null }>("GET", "/events" + qs(q));
  }
}

function qs(q: Record<string, unknown>): string {
  const p = Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return p.length ? "?" + p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&") : "";
}

/** Cliente configurado pelo ambiente, ou null (sem chave → integração desligada, chamadores fazem no-op). */
export function criarAlizoClient(): AlizoClient | null {
  const apiKey = process.env.ALIZO_PARTNER_API_KEY || process.env.ALIZO_PARTNER_API_TOKEN || process.env.SUPPORT_PARTNER_API_TOKEN;
  if (!apiKey) {
    console.warn("[alizo] ALIZO_PARTNER_API_KEY/ALIZO_PARTNER_API_TOKEN ausente — integração desligada (no-op).");
    return null;
  }
  return new AlizoClient({ baseUrl: process.env.ALIZO_API_BASE_URL || "https://www.alizoai.com", apiKey });
}
