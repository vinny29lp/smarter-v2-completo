-- ============================================================
-- ESC-003: Indexes de escala — ActivityLog, Notification, GamificationPoint
-- Data: 2026-06-06
-- Estratégia: CREATE INDEX IF NOT EXISTS (zero downtime, seguro re-executar)
-- ============================================================

-- activity_logs: auditoria por usuário e cleanup por data
CREATE INDEX IF NOT EXISTS "activity_logs_userId_idx"    ON "activity_logs"("userId");
CREATE INDEX IF NOT EXISTS "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "activity_logs_modulo_idx"    ON "activity_logs"("modulo");

-- notifications: notificações não lidas no dashboard (query crítica por usuário)
CREATE INDEX IF NOT EXISTS "notifications_userId_idx"    ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_lida_idx"      ON "notifications"("lida");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

-- gamification_points: ranking groupBy por franquia
CREATE INDEX IF NOT EXISTS "gamification_points_franchiseId_idx" ON "gamification_points"("franchiseId");
CREATE INDEX IF NOT EXISTS "gamification_points_createdAt_idx"   ON "gamification_points"("createdAt");
