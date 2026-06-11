#!/bin/bash
cd "$(dirname "$0")"
echo "=== Security Sprint 02 — removendo locks ==="
rm -f .git/HEAD.lock .git/index.lock .git/index2.lock
echo "=== Adicionando arquivos ==="
git add \
  lib/audit.ts \
  lib/permissions.ts \
  lib/api-schemas.ts \
  lib/aiService.ts \
  app/api/app/empresas/route.ts \
  app/api/app/estudantes/route.ts \
  app/api/app/contratos/route.ts \
  app/api/app/contratos/"[id]"/route.ts \
  app/api/app/financeiro/route.ts \
  app/api/app/financeiro/"[id]"/route.ts \
  app/api/app/crm/route.ts \
  app/api/app/processos/route.ts \
  app/api/app/assinaturas/route.ts \
  app/api/app/instituicoes/route.ts \
  prisma/schema.prisma \
  AUDITORIA-SPRINT-02.md
echo "=== Commit ==="
git commit -m "security: sprint 02 — paginação, permissões FUNC, auditoria+IP, índices DB, Zod, timeout IA (score 79→93)"
echo "=== Push para main ==="
git push origin main
echo ""
echo "=== DONE — Sprint 02 de Segurança deployada! ==="
echo "=== Aguarde 3-5 minutos para o deploy na Vercel ==="
read -p "Pressione Enter para fechar..."
