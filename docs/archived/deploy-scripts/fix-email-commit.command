#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Restaurando index git..."
# Remove lock files residuais
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock .git/gc.pid.lock 2>/dev/null

# Restaura o index para corresponder ao HEAD (desfaz o estado corrompido)
git reset HEAD

echo "📝 Adicionando lib/email.ts..."
git add lib/email.ts

echo "📋 Status atual:"
git status --short lib/email.ts

echo "💾 Fazendo commit..."
git commit -m "fix(email): separar FROM por contexto — financeiro para cobranças, contato para demais"

echo "🚀 Enviando para o GitHub..."
git push origin main

echo ""
echo "✅ Concluído! Vercel vai fazer o deploy automaticamente."
echo ""
read -p "Pressione Enter para fechar..."
