#!/bin/bash
cd "$(dirname "$0")"
echo "=== Push documentação V1 ==="
git push origin main
echo ""
echo "=== DONE ==="
read -p "Enter para fechar..."
