#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Limpando locks do git..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock 2>/dev/null

echo "📝 Adicionando arquivo..."
git add "app/api/app/franqueados/[id]/route.ts"

echo "📋 Status:"
git status --short

echo ""
echo "🚀 Criando commit..."
git commit -m "fix(franqueados): desvincula estudantes ao excluir, bloqueia se tiver contratos"

echo ""
echo "📤 Enviando para GitHub..."
git push origin main

echo ""
echo "✅ Concluído! Vercel fará o deploy automaticamente."
echo ""
read -p "Pressione Enter para fechar..."
