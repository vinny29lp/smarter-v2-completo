-- Automações da Lia (lembretes de assinatura, renovação, avaliações):
--  * automacao_envios: registro de cada envio automático (evita repetir e permite limitar cadência)
--  * contatos_optout:  quem pediu para não receber mensagens automáticas (LGPD)
-- Migração ADITIVA: só cria tabelas novas, não altera nem apaga nada existente.
CREATE TABLE IF NOT EXISTS automacao_envios (
  id            TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tipo          TEXT NOT NULL,
  "refId"       TEXT NOT NULL,
  destinatario  TEXT NOT NULL,
  canal         TEXT NOT NULL DEFAULT 'email',
  detalhe       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automacao_envios_tipo_ref_idx ON automacao_envios (tipo, "refId");
CREATE INDEX IF NOT EXISTS automacao_envios_created_idx ON automacao_envios ("createdAt");

CREATE TABLE IF NOT EXISTS contatos_optout (
  id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  email       TEXT NOT NULL UNIQUE,
  motivo      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automacao_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos_optout ENABLE ROW LEVEL SECURITY;
