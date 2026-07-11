-- Trava no banco para o dedup do fechamento mensal (fechar-mes).
-- Espelha exatamente a checagem que já existe em lib/financeiro/fechar-mes.ts:
-- só conta como "já fechado" o lançamento de categoria=Franquia, não cancelado,
-- para a mesma unidade + competência. Índice parcial (WHERE) para não bloquear
-- a recriação legítima de uma cobrança após a anterior ser cancelada
-- (ver app/api/app/admin/fix-financeiro-pendentes).
-- Verificado em 11/07/2026: 0 duplicatas existentes antes de aplicar.
-- Tabela financials tem 59 linhas (11/07/2026) — CREATE INDEX simples é
-- instantâneo, sem necessidade de CONCURRENTLY (que também não roda via
-- pgbouncer/Prisma, pois exige fora de bloco de transação).
CREATE UNIQUE INDEX IF NOT EXISTS financials_franquia_competencia_unique
  ON financials ("franchiseId", competencia)
  WHERE categoria = 'Franquia' AND (cancelado IS NULL OR cancelado = false);
