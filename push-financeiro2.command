#!/bin/bash
# Fix financeiro v2: franqueadora só vê lançamentos próprios + cobranças de franquia; ações inline
cd "$(dirname "$0")"
echo "🚀 Pushing financeiro fix v2 to GitHub..."
echo ""
for f in $(find .git -name "*.lock" 2>/dev/null); do
  mv "$f" "${f}.bak" 2>/dev/null || true
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
