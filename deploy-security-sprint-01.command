#!/bin/bash
cd "$(dirname "$0")"
echo "=== Security Sprint 01 — removendo locks ==="
rm -f .git/HEAD.lock .git/index.lock .git/index2.lock
echo "=== Adicionando arquivos de segurança ==="
git add \
  app/api/app/contratos/"[id]"/documentos/"[docId]"/route.ts \
  app/api/app/contratos/"[id]"/route.ts \
  app/api/app/crm/"[id]"/route.ts \
  app/api/app/crm/"[id]"/tasks/route.ts \
  app/api/app/empresas/"[id]"/route.ts \
  app/api/app/empresas/route.ts \
  app/api/app/estudantes/route.ts \
  app/api/app/financeiro/"[id]"/route.ts \
  app/api/app/financeiro/route.ts \
  app/api/app/franqueados/"[id]"/route.ts \
  app/api/app/instituicoes/route.ts \
  app/api/debug/email/route.ts \
  AUDITORIA-SEGURANCA-E-ESCALABILIDADE.md \
  CORRECOES-SEGURANCA-SPRINT-01.md \
  app/favicon.ico \
  app/icon.png
echo "=== Commit ==="
git commit -m "security: sprint 01 — autenticação + ownership checks em 12 APIs críticas (score 58→79)"
echo "=== Push para main ==="
git push origin main
echo ""
echo "=== DONE — Sprint de Segurança deployada! ==="
echo "=== Aguarde 3-5 minutos para o deploy na Vercel ==="
read -p "Pressione Enter para fechar..."
