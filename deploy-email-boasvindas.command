#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivo alterado ==="
git add "app/api/public/estudante/route.ts"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: boas-vindas estudante (auto-cadastro público) agora usa await — garante envio em serverless"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
