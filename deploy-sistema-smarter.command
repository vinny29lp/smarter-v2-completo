#!/bin/bash
# Deploy: Sistema Smarter — batch 2 (6 ajustes de funcionalidade)
cd "$(dirname "$0")"

echo "🚀 Deploying Sistema Smarter — Batch 2..."
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

# ── TASK 8: DISC salvo e visualizável no painel do estudante ──────────────
git add "app/portal-estudante/disc/page.tsx"
git add "app/portal-estudante/page.tsx"
git add "app/api/portal/estudante/disc-relatorio/route.ts"

# ── TASK 9: DISC completo no currículo (já estava pronto, sem mudanças) ────

# ── TASK 10: Processo seletivo vinculado a cada vaga ────────────────────────
git add "app/dashboard/vagas/[id]/page.tsx"
git add "app/dashboard/processos/page.tsx"
git add "app/api/app/processos/route.ts"

# ── TASK 11: CPS movido para aba Empresa ────────────────────────────────────
git add "lib/actions/contracts.ts"
git add "prisma/schema.prisma"
git add "app/api/app/empresas/[id]/cps/route.ts"
git add "app/dashboard/empresas/[id]/EmpresaActions.tsx"
git add "app/dashboard/empresas/[id]/page.tsx"

# ── TASK 12: Avaliação semestral online ──────────────────────────────────────
git add "lib/email.ts"
git add "app/api/portal/empresa/avaliacoes/route.ts"
git add "app/api/app/contratos/[id]/enviar-avaliacao/route.ts"
git add "app/dashboard/contratos/[id]/page.tsx"

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
git commit -m "feat: batch-2 — DISC persist, processo seletivo por vaga, CPS na empresa, avaliacao semestral online"

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
