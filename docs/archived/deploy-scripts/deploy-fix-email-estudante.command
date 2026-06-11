#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivo alterado ==="
git add "app/api/app/estudantes/route.ts"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: email boas-vindas estudante — prisma direto, sem Server Action, sem condicional de senha

- Substitui createUser/createStudent (Server Actions) por prisma direto
  Evita problema com revalidatePath de Server Action chamado em Route Handler
- Remove condicao if (!body.senha) — email sempre enviado independente da senha
- Trim na senha para evitar espaço acidental bloqueando envio
- Email fora do try/catch de criação — nunca omitido por erro de DB"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
