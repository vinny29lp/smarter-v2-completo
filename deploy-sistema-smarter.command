#!/bin/bash
# Deploy: Sistema Smarter — batch 3 (DISC completo, mobile fix, PDF, delete empresa/estudante)
cd "$(dirname "$0")"

echo "🚀 Deploying Sistema Smarter — Batch 3..."
echo ""

# Remove TODOS os lock files do git
echo "🔓 Removendo lock files..."
rm -f .git/HEAD.lock .git/index.lock .git/refs/heads/main.lock .git/MERGE_HEAD.lock .git/ORIG_HEAD.lock
echo "✅ Lock files removidos"

# Resetar HEAD e índice para o estado atual do GitHub
echo "🔄 Resetando índice para estado limpo do GitHub..."
git fetch origin main 2>&1
REMOTE_HEAD=$(git rev-parse origin/main)
git reset --mixed "$REMOTE_HEAD" 2>&1
rm -f .git/HEAD.lock .git/index.lock .git/ORIG_HEAD.lock 2>/dev/null

echo ""
echo "📦 Adicionando arquivos alterados..."

# ── BATCH 2 (already deployed, keeping for safety) ──────────────────────────
git add "app/portal-estudante/disc/page.tsx"
git add "app/portal-estudante/page.tsx"
git add "app/api/portal/estudante/disc-relatorio/route.ts"
git add "app/dashboard/vagas/[id]/page.tsx"
git add "app/dashboard/processos/page.tsx"
git add "app/api/app/processos/route.ts"
git add "lib/actions/contracts.ts"
git add "prisma/schema.prisma"
git add "app/api/app/empresas/[id]/cps/route.ts"
git add "app/dashboard/empresas/[id]/EmpresaActions.tsx"
git add "app/dashboard/empresas/[id]/page.tsx"
git add "lib/email.ts"
git add "app/api/portal/empresa/avaliacoes/route.ts"
git add "app/api/app/contratos/[id]/enviar-avaliacao/route.ts"
git add "app/dashboard/contratos/[id]/page.tsx"

# ── BATCH 3: DISC mobile fix + PDF auto-print ───────────────────────────────
git add "lib/pdf-wrapper.ts"
git add "app/dashboard/contratos/[id]/documentos/[docId]/page.tsx"
git add "app/api/app/estudantes/[id]/curriculo/route.ts"

# ── BATCH 3: DISC completo (radar, motivadores, liderança, carreiras) ────────
git add "lib/documents/disc-report.ts"
git add "app/dashboard/processos/page.tsx"
git add "app/api/portal/estudante/disc-relatorio/route.ts"

# ── BATCH 3: Delete empresa/estudante para FRANQUEADORA ──────────────────────
git add "app/api/app/empresas/[id]/route.ts"
git add "app/api/app/estudantes/[id]/route.ts"
git add "app/dashboard/empresas/[id]/EmpresaActions.tsx"
git add "app/dashboard/estudantes/[id]/page.tsx"

# Deploy script atualizado
git add deploy-sistema-smarter.command

echo ""
echo "📋 Arquivos no commit:"
git diff --cached --name-only

# Verificar se há algo para commitar
STAGED=$(git diff --cached --name-only | wc -l)
if [ "$STAGED" -eq 0 ]; then
  echo "⚠️  Nada para commitar."
  read -p "Pressione Enter para fechar..."
  exit 0
fi

echo ""
echo "💾 Criando commit..."
git commit -m "feat: batch-3 — DISC completo com radar/motivadores/liderança/carreiras, PDF auto-print, mobile fix, delete empresa/estudante"

echo "🚀 Fazendo push..."
git push origin main

echo ""
if [ $? -eq 0 ]; then
  echo "✅ Push realizado com sucesso! Vercel vai fazer deploy automaticamente."
  echo "   Acompanhe em: https://vercel.com/smarter1/smarter-v2-completo"
else
  echo "❌ Push falhou. Verifique o erro acima."
fi

echo ""
read -p "Pressione Enter para fechar..."
