#!/bin/bash
# Deploy: Preparação para Produção — Tasks #23 a #31
cd "$(dirname "$0")"

echo "🚀 Iniciando deploy de preparação para produção..."

# Remove locks se existirem
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock 2>/dev/null

# Adiciona todos os arquivos alterados
git add \
  "app/api/app/contratos/[id]/documentos/[docId]/route.ts" \
  "app/dashboard/contratos/[id]/documentos/[docId]/page.tsx" \
  "app/dashboard/franqueados/novo/page.tsx" \
  "app/portal-empresa/avaliacoes/page.tsx" \
  "components/forms/EmpresaForm.tsx" \
  "components/forms/EstudanteForm.tsx" \
  "lib/documents/templates.ts" \
  "lib/documents/utils.ts" \
  "lib/templates.ts" \
  "lib/validations.ts"

# Commit
git commit -m "feat: preparação para produção — validações, documentos e correções

- fix(TCE): 'trinta reais horas' → 'trinta horas' via numeroExtenso()
- fix(contrato): Cláusulas de inadimplência, LGPD e limitação de responsabilidade
- feat(rescisão): Campo obrigatório 'Tipo de Rescisão' no formulário e PDF
- fix(recesso): Texto 'As partes acordam a concessão do recesso remunerado'
- feat(avaliação): Pontos Fortes, Pontos de Melhoria, Parecer Final, Recomendação
- feat(validações): CPF, CNPJ, CEP, email, telefone, UF com algoritmos oficiais
- feat(CEP): Auto-preenchimento via ViaCEP em Empresa, Estudante e Franqueado
- fix(ortografia): Acentuação correta em todos os documentos (lib/templates.ts)"

# Push para GitHub (Vercel auto-deploya)
git push origin main

echo ""
echo "✅ Deploy enviado! Vercel irá compilar e publicar automaticamente."
echo "   Acompanhe em: https://vercel.com/dashboard"
