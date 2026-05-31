#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Limpando locks do git..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock 2>/dev/null

echo "📤 Enviando para GitHub..."
git push origin main

echo ""
echo "✅ Concluído! Vercel fará o deploy automaticamente."
echo "Acompanhe em: https://vercel.com/dashboard"
echo ""
read -p "Pressione Enter para fechar..."
