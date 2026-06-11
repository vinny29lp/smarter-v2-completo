#!/bin/bash
echo "=== Verificando domínio smarterestagios.com.br no Resend ==="
echo ""

DOMAIN_ID="ec3deaea-162e-424a-9b09-8beb77e97b2d"
API_KEY="re_LTyVg267_7D5DRDhzDS2FEab4aW8eEd1E"

echo "1) Verificando status atual do domínio..."
STATUS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "https://api.resend.com/domains/$DOMAIN_ID" \
  -H "Authorization: Bearer $API_KEY")
echo "   → $STATUS"
echo ""

echo "2) Acionando verificação do domínio..."
VERIFY=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "https://api.resend.com/domains/$DOMAIN_ID/verify" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")
echo "   → $VERIFY"
echo ""

echo "3) Verificando status após verificação..."
STATUS2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "https://api.resend.com/domains/$DOMAIN_ID" \
  -H "Authorization: Bearer $API_KEY")
echo "   → $STATUS2"
echo ""

echo "=== Pronto! Cole o resultado aqui no Claude. ==="
read -p "Pressione Enter para fechar..."
