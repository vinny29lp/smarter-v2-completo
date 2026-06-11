#!/bin/bash
cd "$(dirname "$0")"
echo "=== Sprint Final de Blindagem — Deploy ==="
echo ""

# Limpar locks
rm -f .git/HEAD.lock .git/index.lock .git/index2.lock

echo "=== Status do repositório ==="
git status

echo ""
echo "=== Adicionando arquivos alterados ==="
git add \
  app/api/app/crm/"[id]"/route.ts \
  app/api/app/vagas/"[id]"/route.ts \
  app/api/app/processos/"[id]"/route.ts \
  app/api/app/instituicoes/"[id]"/route.ts \
  app/api/app/estudantes/"[id]"/route.ts \
  app/api/app/estudantes/"[id]"/curriculo/route.ts \
  app/api/app/empresas/"[id]"/route.ts \
  app/api/app/config/route.ts \
  app/api/app/gamificacao/route.ts \
  app/api/public/estudante/route.ts \
  app/api/auth/forgot-password/route.ts \
  lib/auth.ts \
  next.config.mjs \
  DEPLOY-SAFE-CHECKLIST.md \
  TESTES-SEGURANCA-FINAL.md \
  AUDITORIA-FINAL-PRODUCAO.md \
  AUDITORIA-FINAL-PRODUCAO-V2.md \
  RELATORIO-BLINDAGEM-PRODUCAO.md

echo ""
echo "=== Commit ==="
git commit -m "security: sprint blindagem final — 8 altos + 7 médios corrigidos, headers HTTP, score 71→88 (SEC-A01 a A08, SEC-M01/M03/M05/M06, LGPD-B01, SEC-B01/B04)"

echo ""
echo "=== Push para main ==="
git push origin main

echo ""
echo "=== DONE — Blindagem deployada! Aguarde 3-5 minutos na Vercel ==="
read -p "Pressione Enter para fechar..."
