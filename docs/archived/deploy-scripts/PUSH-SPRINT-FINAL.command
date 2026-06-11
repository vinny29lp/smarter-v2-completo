#!/bin/bash
# PUSH SPRINT FINAL DE ESTABILIDADE
# Executa no Mac nativo (Terminal) — duplo clique para rodar
set -e

REPO="/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"
cd "$REPO"

echo ""
echo "=================================================="
echo "  SPRINT FINAL — COMMIT & PUSH"
echo "=================================================="
echo ""

# Remove lock se existir
if [ -f ".git/HEAD.lock" ]; then
  echo "🔓 Removendo git lock..."
  rm -f .git/HEAD.lock
fi
if [ -f ".git/index.lock" ]; then
  rm -f .git/index.lock
fi

echo "📋 Status atual:"
git status --short
echo ""

# Stage de todos os arquivos do sprint
git add \
  "app/api/app/notificacao/[id]/pdf/route.ts" \
  "app/dashboard/page.tsx" \
  "app/dashboard/solicitacao/[id]/page.tsx" \
  "lib/documents/templates.ts" \
  "next.config.mjs" \
  "prisma/schema.prisma" \
  "prisma/migrations/add_missing_indexes.sql" \
  "docs/RELATORIO-CACHE-DASHBOARD.md" \
  "docs/RELATORIO-INDICES-FINAIS.md" \
  "docs/RELATORIO-TYPESCRIPT.md"

echo "✅ Arquivos staged."
echo ""

git commit -m "fix(sprint-estabilidade): ALTO-001 cache + ALTO-002 typescript + ALTO-003 indices

ALTO-003 — Indices de banco (9 novos, zero downtime):
- users: franchiseId, companyId, role
- vacancies: companyId, franchiseId, status
- applications: studentId, vacancyId
- employees: franchiseId
- Aplicados no Supabase via CREATE INDEX IF NOT EXISTS
- Migration: prisma/migrations/add_missing_indexes.sql

ALTO-001 — Cache dashboard (unstable_cache, TTL 30s):
- 7 funcoes de leitura cacheadas: kpis, franquias, financeiro,
  agenda, recentes, franqueados, ranking
- Reducao estimada: 80-95% menos queries em visitas repetidas
- Notificacoes NAO cacheadas (tempo-real)

ALTO-002 — TypeScript (erros reais corrigidos):
- templates.ts: Record<string,number> -> Record<string,string|number>
  + helper numVal() para cast numerico
- notificacao/pdf, dashboard/page, solicitacao/page:
  createdAt ?? new Date() — corrige TS2769
- next.config.mjs: removido ignoreBuildErrors:true

Relatorios: docs/RELATORIO-*.md"

echo ""
echo "🚀 Enviando para GitHub..."
git push origin main

echo ""
echo "=================================================="
echo "  ✅ PUSH CONCLUÍDO — Vercel build iniciado"
echo "=================================================="
echo ""
echo "Acompanhe o deploy em: https://vercel.com/dashboard"
echo ""
read -p "Pressione Enter para fechar..."
