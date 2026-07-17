-- Histórico de conversas com a Lia (assistente de suporte de IA), disponível para
-- FRANQUEADO, EMPRESA, ESTUDANTE (logados via NextAuth) e IES (portal por token).
-- actorId = session.user.id para os três primeiros, ou Institution.id para IES.
-- franchiseId é só informativo (sem FK) — igual ao padrão já usado em ai_usage_logs,
-- porque FRANQUEADORA usa um sentinel sem registro real de Franchise e nem toda IES
-- tem franchiseId preenchido.
-- Puramente aditivo: nova tabela, nenhuma coluna existente é alterada.
CREATE TABLE IF NOT EXISTS "lia_messages" (
  "id"          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "franchiseId" TEXT,
  "actorType"   TEXT NOT NULL,
  "actorId"     TEXT NOT NULL,
  "role"        TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lia_messages_actorId_createdAt_idx" ON "lia_messages"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "lia_messages_franchiseId_idx" ON "lia_messages"("franchiseId");
