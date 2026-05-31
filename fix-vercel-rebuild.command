#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Re-adicionando todos os arquivos ao git ==="
git add .
echo "=== Commit ==="
git commit -m "fix(git): restaura todo o codebase no repositorio — arquivos perdidos do index em f0af1f7"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
