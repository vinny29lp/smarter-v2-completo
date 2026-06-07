#!/bin/bash
cd "$(dirname "$0")"
echo "=== Push + Tag smarter-stable-v1 ==="
echo ""

# Limpar locks
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null

echo "--- Push main ---"
git push origin main

echo ""
echo "--- Criar tag ---"
git tag smarter-stable-v1 2>/dev/null && echo "Tag criada localmente" || echo "Tag já existe"

echo ""
echo "--- Push tag ---"
git push origin smarter-stable-v1

echo ""
echo "--- Log final ---"
git log --oneline -3
git tag | grep stable

echo ""
echo "=== DONE ==="
read -p "Enter para fechar..."
