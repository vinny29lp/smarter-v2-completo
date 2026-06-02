#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivo alterado ==="
git add "app/api/app/empresas/route.ts"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: razaoSocial e uf como string vazia — corrige 500 no cadastro de empresa

- razaoSocial: body.razaoSocial || '' (era null — causava PrismaClientValidationError)
- uf: body.uf || '' (era null — mesmo problema)
- String non-nullable no schema Prisma nao aceita null, apenas string vazia
- Erro anterior: Prisma jogava validationError contendo 'cnpj' no dump,
  frontend identificava erroneamente como 'CNPJ ja cadastrado'"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
