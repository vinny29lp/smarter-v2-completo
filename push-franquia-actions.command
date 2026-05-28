#!/bin/bash
cd "$(dirname "$0")"
echo "=== Smarter: Botões Editar/Excluir/Cobrar na tabela de Franquias ==="
rm -f .git/index.lock 2>/dev/null || true
git add -A
git commit -m "feat: adiciona botoes Cobrar, Editar e Excluir na tabela Cobrancas de Franquias"
git push origin main
echo ""
echo "=== Pronto! Aguarde ~2 min no Vercel ==="
read -p "Pressione Enter para fechar..."
