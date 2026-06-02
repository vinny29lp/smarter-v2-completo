#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivos alterados ==="
git add app/favicon.ico
git add "app/api/app/estudantes/route.ts"
git add "app/api/app/empresas/[id]/acesso/route.ts"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: favicon Smarter restaurado + emails de boas-vindas aguardados (serverless)"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
