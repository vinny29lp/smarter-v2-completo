#!/bin/bash
cd "$(dirname "$0")"
echo "=== Fix: edição de contrato — string vazia em campos numéricos ==="
rm -f .git/HEAD.lock .git/index.lock .git/index2.lock
git add app/api/app/contratos/"[id]"/route.ts
git commit -m "fix: converter string vazia para null em campos Float ao editar contrato (auxTransporte, valorEmpresa)"
git push origin main
echo ""
echo "=== DONE — Deploy concluído! Aguarde 3-5 minutos ==="
read -p "Pressione Enter para fechar..."
