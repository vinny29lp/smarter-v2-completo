#!/bin/bash
cd "$(dirname "$0")"
echo "=== Push fix de latência do banco ==="
echo ""
echo "Arquivos modificados:"
git diff --name-only HEAD~1 HEAD
echo ""
echo "Fazendo push para main..."
git push origin main
echo ""
if [ $? -eq 0 ]; then
  echo "✅ Push realizado com sucesso!"
  echo "   A Vercel vai fazer o deploy automaticamente."
  echo "   Após o deploy, a latência deve cair de ~2400ms para <200ms."
else
  echo "❌ Erro no push. Verifique suas credenciais Git."
fi
echo ""
echo "Pressione qualquer tecla para fechar..."
read -n 1
