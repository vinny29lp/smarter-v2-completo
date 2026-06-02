#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Commit vazio para destravar deploy ==="
git commit --allow-empty -m "chore: trigger redeploy — unblock INITIALIZING"
echo "=== Push para main ==="
git push origin main
echo "=== DONE — aguarde 3-5 minutos para o deploy concluir ==="
read -p "Pressione Enter para fechar..."
