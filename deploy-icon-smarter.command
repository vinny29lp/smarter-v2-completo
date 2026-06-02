#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock .git/index2
echo "=== Push para main — icon Smarter ==="
git push origin main
echo "=== DONE — aguarde 3-5 minutos ==="
read -p "Pressione Enter para fechar..."
