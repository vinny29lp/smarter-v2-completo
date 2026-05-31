#!/bin/bash
cd "$(dirname "$0")"
echo "=== Smarter: Deploy correções financeiras ==="

rm -f .git/index.lock 2>/dev/null || true

git add -A

git commit -m "fix: financeiro - baixa só Franqueadora, KPIs alinhados dashboard+financeiro

- [id]/route.ts: FRANQUEADO bloqueado de dar baixa em categoria Franquia
- financeiro/page.tsx: entradasMes/saidasMes/caixa corretos para Franqueadora
  (Franquia PAGO = receita, não despesa)
- financeiro/page.tsx: remove botão 'Registrar Pagamento' da seção Franqueado;
  mostra '🔒 Aguardando confirmação da Franqueadora'
- financeiro/page.tsx: botão '💰 Dar Baixa' explícito na tabela da Franqueadora
- dashboard/page.tsx: getFinanceiro refatorado com saidasMes + caixa corretos
- dashboard/page.tsx: seção financeiro expandida para 5 KPIs (igual ao financeiro)"

git push origin main

echo ""
echo "=== Deploy enviado! Aguarde ~2 min no Vercel ==="
read -p "Pressione Enter para fechar..."
