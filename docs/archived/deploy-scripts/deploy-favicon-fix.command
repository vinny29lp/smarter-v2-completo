#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivos ==="
git add "app/favicon.ico"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: favicon Smarter com logo correta — icone azul com logo branca (16/32/48px)"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
