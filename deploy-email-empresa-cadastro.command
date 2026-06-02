#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivos ==="
git add "app/api/app/empresas/route.ts"
git add "components/forms/EmpresaForm.tsx"
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: email boas-vindas empresa no cadastro — POST /api/app/empresas cria empresa+acesso+email

- Novo POST em /api/app/empresas: cria empresa, gera usuario EMPRESA e envia boas-vindas
- EmpresaForm: novo cadastro chama API route (email automatico); edicao continua com updateCompany
- Senha gerada uma unica vez — mesma no user.create e no email
- Email fora do try/catch de criacao — nunca omitido por erro de DB
- Nao altera: GET /api/app/empresas, updateCompany, /api/app/empresas/[id]/acesso"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
