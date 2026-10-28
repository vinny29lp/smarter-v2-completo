CREATE TABLE IF NOT EXISTS "support_cases" (
  "id" TEXT PRIMARY KEY,
  "externalReference" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "franchiseId" TEXT,
  "companyId" TEXT,
  "reporterName" TEXT NOT NULL,
  "reporterEmail" TEXT NOT NULL,
  "reporterPhone" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "attemptedAction" TEXT NOT NULL,
  "errorMessage" TEXT NOT NULL,
  "imageUrl" TEXT,
  "technicalData" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "protocol" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "support_cases_userId_createdAt_idx"
  ON "support_cases" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_cases_franchiseId_idx"
  ON "support_cases" ("franchiseId");
CREATE INDEX IF NOT EXISTS "support_cases_status_idx"
  ON "support_cases" ("status");
