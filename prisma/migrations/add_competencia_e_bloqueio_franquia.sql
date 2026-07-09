-- ============================================================
-- Financeiro: competência de cobrança + bloqueio por inadimplência
-- Data: 2026-07-09
-- Estratégia: ADD COLUMN IF NOT EXISTS + backfill (zero downtime, seguro re-executar)
-- ============================================================

-- 1. Competência (mês de referência "YYYY-MM") — dedup do fechamento passa a usar
--    este campo em vez de createdAt, tornando fechamentos forçados seguros.
ALTER TABLE "financials" ADD COLUMN IF NOT EXISTS "competencia" TEXT;
CREATE INDEX IF NOT EXISTS "financials_competencia_idx" ON "financials"("competencia");

-- 2. Dia de vencimento da Taxa de Desenvolvimento por unidade (padrão dia 10)
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "diaVencimentoTaxa" INTEGER DEFAULT 10;

-- 3. Bloqueio de acesso por inadimplência (30+ dias)
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "acessoBloqueado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "bloqueadoEm" TIMESTAMPTZ;
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "bloqueioMotivo" TEXT;
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "bloqueioLiberadoAte" TIMESTAMPTZ;

-- 4. Backfill: competência das cobranças de Franquia existentes = mês do vencimento.
--    (As 7 cobranças do fechamento forçado de 09/07/2026 têm vencimento em julho —
--    são a cobrança de julho, apesar da descrição dizer "agosto".)
--    AT TIME ZONE 'UTC' porque os vencimentos são gravados como meia-noite UTC
--    (o painel também exibe com timeZone: "UTC").
UPDATE "financials"
SET "competencia" = to_char("vencimentoAt" AT TIME ZONE 'UTC', 'YYYY-MM')
WHERE categoria = 'Franquia' AND "vencimentoAt" IS NOT NULL AND "competencia" IS NULL;

-- 5. Corrige a descrição enganosa das cobranças de julho geradas no fechamento
--    forçado de 09/07 (rotuladas "agosto de 2026" pelo bug do mesRef).
UPDATE "financials"
SET descricao = replace(descricao, 'agosto de 2026', 'julho de 2026')
WHERE categoria = 'Franquia' AND "competencia" = '2026-07' AND descricao LIKE '%agosto de 2026%';
