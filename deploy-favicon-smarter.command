#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Push para main — favicon Smarter ==="
git push origin main
echo "=== DONE — aguarde 3-5 minutos para o deploy concluir ==="
read -p "Pressione Enter para fechar..."
