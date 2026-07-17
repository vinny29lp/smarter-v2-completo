-- Feedback (bug/elogio/critica/sugestao) capturado automaticamente pela Lia durante uma
-- conversa, extraído de um marcador oculto que o próprio modelo anexa à resposta quando
-- identifica um feedback (ver lib/lia/feedback.ts). actorId = session.user.id para
-- FRANQUEADO/EMPRESA/ESTUDANTE, ou Institution.id para IES — mesmo padrão de lia_messages.
-- franchiseId é só informativo (sem FK), pelo mesmo motivo de lia_messages: FRANQUEADORA
-- usa um sentinel sem registro real de Franchise, e nem toda IES tem franchiseId.
-- Consumido pelo painel "🔔 Lembretes e Alertas" do dashboard (GET /api/app/alertas).
-- Puramente aditivo: nova tabela, nenhuma coluna existente é alterada.
CREATE TABLE IF NOT EXISTS "lia_feedback" (
  "id"          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "franchiseId" TEXT,
  "tipo"        TEXT NOT NULL,
  "sentimento"  TEXT NOT NULL,
  "resumo"      TEXT NOT NULL,
  "actorType"   TEXT NOT NULL,
  "actorId"     TEXT NOT NULL,
  "resolvido"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lia_feedback_franchiseId_idx" ON "lia_feedback"("franchiseId");
CREATE INDEX IF NOT EXISTS "lia_feedback_tipo_idx" ON "lia_feedback"("tipo");
CREATE INDEX IF NOT EXISTS "lia_feedback_resolvido_idx" ON "lia_feedback"("resolvido");
CREATE INDEX IF NOT EXISTS "lia_feedback_createdAt_idx" ON "lia_feedback"("createdAt");
