#!/bin/bash
# Deploy: Sistema Smarter — adiciona apenas arquivos específicos (sem node_modules)
cd "$(dirname "$0")"

echo "🚀 Deploying Sistema Smarter..."
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
echo "📦 Adicionando apenas os arquivos de código alterados..."

# Assinatura digital — fix completo + download assinado
git add lib/autentique.ts
git add "app/api/app/contratos/[id]/documentos/[docId]/autentique/route.ts"
git add "app/api/app/contratos/[id]/documentos/[docId]/route.ts"
git add "app/api/app/contratos/[id]/documentos/[docId]/download-assinado/route.ts"
git add "app/dashboard/contratos/[id]/documentos/[docId]/page.tsx"

# Fix: publicação de vagas travada em "publicando" — try/catch adicionado
git add "app/dashboard/vagas/nova/page.tsx"

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
git commit -m "fix: vagas nova page try/catch + autentique download assinado"

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
