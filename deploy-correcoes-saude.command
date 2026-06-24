#!/bin/bash
cd "/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo" || exit 1
rm -f .git/index.lock

git add \
  "next.config.mjs" \
  "app/api/public/vaga/inscrever-novo/route.ts" \
  "lib/actions/contracts.ts" \
  "lib/auth.ts" \
  "app/api/app/ai/_shared.ts" \
  "lib/aiService.ts" \
  "lib/prisma.ts"

git commit -m "fix: segurança e estabilidade — 10 correções

- C1: Remove ignoreBuildErrors/ignoreDuringBuilds (TypeScript ativo)
- C2: inscrever-novo — rate limit + try/catch + transaction + vagaId validation
- A1: createContract — contract+documents em \$transaction
- A4: Login — rate limit por email/IP (10 tentativas/min)
- M1: updateContract — allowlist explícita de campos editáveis
- M2: getContracts — paginação real (page/limit/skip)
- M3: IA — FRANQUEADORA não bloqueada por falta de franchiseId
- M4: connection_limit — configurável via PRISMA_POOL_SIZE env
- M5: [AUTH_PERF] logs condicionados a NODE_ENV=development"

git push
echo "--- DEPLOY ENVIADO ---"
read -p "Pressione Enter para fechar..."
