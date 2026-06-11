#!/bin/bash
# Push dos 3 ajustes críticos — FRANQUEADORA empresas/CRM + autocomplete contratos
cd "$(dirname "$0")"

echo "🚀 Push — página pública /vagas + rota inscrever + fix getVacancies"
echo ""

# Remove lock files
echo "🔓 Removendo lock files..."
rm -f .git/HEAD.lock .git/index.lock .git/refs/heads/main.lock .git/MERGE_HEAD.lock .git/ORIG_HEAD.lock 2>/dev/null
echo "✅ Lock files removidos"
echo ""

# Verificar commit pendente
echo "📋 Commits para enviar:"
git log origin/main..HEAD --oneline 2>/dev/null || git log --oneline -3
echo ""

# Push
echo "📤 Enviando para GitHub..."
git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Push concluído com sucesso!"
  echo ""
  echo "Arquivos enviados:"
  echo "  • prisma/schema.prisma (Company.franchiseId e CrmLead.franchiseId → nullable)"
  echo "  • app/api/app/crm/route.ts (GET + POST corrigidos para FRANQUEADORA)"
  echo "  • app/api/app/estudantes/buscar/route.ts (nova rota)"
  echo "  • app/api/app/empresas/buscar/route.ts (nova rota)"
  echo "  • app/api/app/instituicoes/buscar/route.ts (nova rota)"
  echo "  • components/forms/ContratoForm.tsx (autocomplete)"
  echo "  • app/dashboard/contratos/novo/page.tsx (sem preload)"
  echo "  • RELATORIO-FRANQUEADORA-EMPRESAS.md"
  echo "  • RELATORIO-CRM-FRANQUEADORA.md"
  echo "  • RELATORIO-BUSCA-CONTRATOS.md"
else
  echo ""
  echo "❌ Erro no push. Verifique credenciais GitHub."
fi

echo ""
read -p "Pressione Enter para fechar..."
