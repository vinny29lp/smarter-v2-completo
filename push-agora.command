#!/bin/bash
cd "$(dirname "$0")"
echo "=== Enviando commit para GitHub ==="
git push origin main
echo ""
echo "=== Pronto! Vercel vai fazer o deploy automaticamente (~2 min) ==="
read -p "Pressione Enter para fechar..."
