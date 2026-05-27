#!/bin/bash
cd "$(dirname "$0")"
find .git -name "*.lock" 2>/dev/null | while read f; do mv "$f" "${f}.bak" 2>/dev/null || true; done
git push origin main
echo "✅ Batch 5 enviado! Aguarde o Vercel fazer o deploy."
read -p "Pressione Enter para fechar..."
