#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Push direto (commit já feito) ==="
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
