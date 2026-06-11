#!/bin/bash
# Fix financeiro v3: 4 KPIs, 1 entrada por franquia, relatório mensal completo
cd "$(dirname "$0")"
echo "🚀 Pushing financeiro fix v3..."
echo ""
for f in $(find .git -name "*.lock" 2>/dev/null); do
  mv "$f" "${f}.bak" 2>/dev/null || true
done
git push origin main
echo ""
if [ $? -eq 0 ]; then
  echo "✅ Push ok! Vercel fará deploy automaticamente."
  echo "   Acompanhe em: https://vercel.com/smarter1/smarter-v2-completo"
else
  echo "❌ Push falhou. Verifique o erro acima."
fi
echo ""
read -p "Pressione Enter para fechar..."
