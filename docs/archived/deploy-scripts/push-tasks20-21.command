#!/bin/bash
cd "$(dirname "$0")"
echo "=== Smarter: Deploy Tasks #20 e #21 ==="

# Remove git lock se existir
rm -f .git/index.lock 2>/dev/null && echo "Lock removido" || true

# Stage todos os arquivos
git add -A

# Commit
git commit -m "fix: taxa franquia A PAGAR; solicitacao so para unidade; abrir+PDF

- fechar-mes: tipo saida para cobranças de franquia aparecerem como A PAGAR no franqueado
- financeiro/page.tsx: aReceber e contasAPagar ajustados Franqueadora e Franqueado
- dashboard/page.tsx: getFinanceiro corrigido; solicitations so para FRANQUEADO/FUNCIONARIO
- solicitar-estagiario: remove FRANQUEADORA dos destinatarios de notificacao
- novo: /dashboard/solicitacao/[id] — detalhe + marcar como lida
- novo: /api/app/notificacao/[id]/pdf — gera HTML imprimivel com auto-print"

# Push
git push

echo ""
echo "=== Deploy concluído! Aguarde o Vercel processar (~2 min) ==="
read -p "Pressione Enter para fechar..."
