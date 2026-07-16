-- Tokens de parceiro escopados por franquia, para a API de escrita no CRM
-- (POST/PATCH /api/partners/leads), usada pelo Sales Rep do AI Workforce OS/Alizo.
-- Diferente de PARTNER_CANDIDATES_API_TOKEN (env var global, somente leitura):
-- aqui cada franquia/unidade precisa do próprio token, então usamos uma tabela
-- em vez de uma env var única. tokenHash guarda SHA-256 do token em texto puro
-- (nunca o valor original), permitindo lookup indexado sem expor o segredo.
-- Puramente aditivo: nova tabela, nenhuma coluna existente é alterada.
CREATE TABLE IF NOT EXISTS "partner_api_tokens" (
  "id"          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tokenHash"   TEXT NOT NULL,
  "franchiseId" TEXT NOT NULL,
  "descricao"   TEXT,
  "ativo"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ DEFAULT now(),
  "lastUsedAt"  TIMESTAMPTZ,
  CONSTRAINT "partner_api_tokens_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "partner_api_tokens_franchiseId_fkey" FOREIGN KEY ("franchiseId")
    REFERENCES "franchises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "partner_api_tokens_franchiseId_idx" ON "partner_api_tokens"("franchiseId");
