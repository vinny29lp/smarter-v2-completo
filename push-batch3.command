#!/bin/bash
# Push batch-3 changes to GitHub → triggers Vercel deploy
cd "$(dirname "$0")"

echo "🚀 Pushing batch-3 to GitHub..."
echo ""

# Clear any git lock files
for f in $(find .git -name "*.lock" 2>/dev/null); do
  rm -f "$f" 2>/dev/null && echo "removed $f" || mv "$f" "${f}.bak" 2>/dev/null
done

git push origin main

echo ""
if [ $? -eq 0 ]; then
  echo "✅ Push ok! Vercel vai fazer deploy automaticamente."
  echo "   Acompanhe em: https://vercel.com/smarter1/smarter-v2-completo"
else
  echo "❌ Push falhou. Verifique o erro acima."
fi

echo ""
read -p "Pressione Enter para fechar..."
