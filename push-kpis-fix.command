#!/bin/bash
cd "$(dirname "$0")"
echo "=== Smarter: Fix KPIs Franqueado ==="
rm -f .git/index.lock 2>/dev/null || true
git add -A
git commit -m "fix: KPIs franqueado — Franquia em Contas a Pagar, não em A Receber

Usa categoria='Franquia' como classificador (compat. com registros antigos e novos):
- Franqueado: contasAPagar = saidas + Franquia pendente (qualquer tipo)
- Franqueado: aReceber = entradas pendentes SEM Franquia
- Franqueado: entradasMes = entradas pagas SEM Franquia
- Franqueado: saidasMes = saidas pagas + Franquia paga
- Franqueadora: Franquia = receita (entradasMes + aReceber)
- dashboard/page.tsx: getFinanceiro refatorado com mesma logica
- dashboard: 5 KPIs alinhados com pagina financeiro"
git push origin main
echo ""
echo "=== Pronto! Aguarde ~2 min no Vercel ==="
read -p "Pressione Enter para fechar..."
