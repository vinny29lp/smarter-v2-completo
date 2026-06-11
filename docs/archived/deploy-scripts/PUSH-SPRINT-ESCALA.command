#!/bin/bash
# PUSH SPRINT DE ESCALA — 50 a 100 Franqueados
# Duplo clique para executar
set -e

REPO="/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"
cd "$REPO"

echo ""
echo "=================================================="
echo "  SPRINT ESCALA — COMMIT & PUSH"
echo "=================================================="
echo ""

# Remove lock se existir
[ -f ".git/HEAD.lock" ]  && rm -f .git/HEAD.lock  && echo "🔓 HEAD.lock removido"
[ -f ".git/index.lock" ] && rm -f .git/index.lock && echo "🔓 index.lock removido"

echo "📋 Status atual:"
git status --short
echo ""

# Stage de todos os arquivos do sprint de escala
git add \
  "app/api/app/financeiro/fechar-mes/route.ts" \
  "app/api/app/franqueados/route.ts" \
  "app/api/app/estudantes/importar/route.ts" \
  "app/api/app/admin/cleanup/route.ts" \
  "prisma/schema.prisma" \
  "prisma/migrations/add_scale_indexes.sql" \
  "middleware.ts" \
  "next.config.mjs" \
  "app/layout.tsx" \
  "app/providers.tsx" \
  "docs/RELATORIO-ESCALA-50-100-FRANQUEADOS.md"

echo "✅ Arquivos staged."
echo ""

git commit -m "feat(escala): sprint 50-100 franqueados — ESC-001 a ESC-006

ESC-001 — Fechar mês paralelizado (processInBatches de 10):
- Substituído loop sequencial for...of por Promise.all em batches
- Pre-check de duplicidade em 1 query (IN) antes de processar
- Evita timeout de 30s da Vercel com 100 franqueados

ESC-002 — Paginação em GET /api/app/franqueados:
- Adicionado take/skip/page/search na listagem
- Limite de 50 por página, cache-control 60s
- Evita payload crescente com 100+ franqueados

ESC-003 — Indexes de escala aplicados no Supabase:
- activity_logs: userId, createdAt, modulo
- notifications: userId, lida, createdAt
- gamification_points: franchiseId, createdAt
- Total: 9 novos indexes no banco de producao

ESC-004 — Importacao de estudantes com limite e paralelizacao:
- Limite de 200 estudantes por request (retorna erro claro se exceder)
- Pre-verificacao de duplicidade em lote (1 query para todos os emails/CPFs)
- Criacao em paralelo com concorrencia de 10 (sem loop sequencial)

ESC-005 — Cleanup automatico de logs antigos:
- Nova rota POST /api/app/admin/cleanup
- Remove ActivityLog > 90 dias e Notification lida > 30 dias
- GET retorna preview (sem deletar), suporte a ?dry_run=true
- Exclusivo FRANQUEADORA

ESC-006 — CSP completo com nonce por request:
- middleware.ts: gera nonce UUID por request, aplica CSP em TODAS as rotas
- script-src: 'self' 'nonce-{nonce}' 'strict-dynamic'
- style-src: 'self' 'unsafe-inline' (necessario para Tailwind)
- img-src: 'self' data: blob: https: (PDFs e imagens externas)
- frame-src: 'self' blob: (iframe srcDoc para documentos)
- frame-ancestors 'none' substitui X-Frame-Options
- layout.tsx: le nonce via headers() e propaga para Providers
- next.config.mjs: removido X-Frame-Options (redundante com CSP)
- Matcher expandido: cobre todas as rotas HTML da aplicacao" 2>&1

echo ""
echo "🚀 Enviando para GitHub..."
git push origin main

echo ""
echo "=================================================="
echo "  ✅ PUSH CONCLUIDO — Vercel build iniciado"
echo "=================================================="
echo ""
echo "Acompanhe: https://vercel.com/dashboard"
echo ""
read -p "Pressione Enter para fechar..."
