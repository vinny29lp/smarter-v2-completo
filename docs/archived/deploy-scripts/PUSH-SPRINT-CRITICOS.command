#!/bin/bash
# PUSH SPRINT CRÍTICOS — CRIT-001, CRIT-002, ALTO-A, ALTO-B, ALTO-C, ALTO-D
# Duplo clique para executar
set -e

REPO="/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"
cd "$REPO"

echo ""
echo "=================================================="
echo "  SPRINT CRÍTICOS — COMMIT & PUSH"
echo "=================================================="
echo ""

# Remove lock se existir
[ -f ".git/HEAD.lock" ]  && rm -f .git/HEAD.lock  && echo "🔓 HEAD.lock removido"
[ -f ".git/index.lock" ] && rm -f .git/index.lock && echo "🔓 index.lock removido"

echo "📋 Status atual:"
git status --short
echo ""

git add \
  "lib/autentique.ts" \
  "lib/actions/vacancies.ts" \
  "lib/rate-limit.ts" \
  "app/api/app/vagas/route.ts" \
  "app/api/app/franqueados/[id]/route.ts" \
  "app/api/app/processos/candidatar/route.ts" \
  "app/api/public/estudante/route.ts" \
  "app/api/public/lead/route.ts" \
  "app/api/auth/forgot-password/route.ts" \
  "docs/RELATORIO-AUDITORIA-ESCALA-COMPLETO.md"

echo "✅ Arquivos staged."
echo ""

git commit -m "fix(escala): sprint críticos — CRIT-001/002 + ALTO-A/B/C/D

CRIT-001 — lib/autentique.ts: AbortSignal.timeout nas chamadas fetch:
- enviarParaAutentique: timeout 20s (era sem limite — hang de 30s garantido)
- buscarStatusAutentique: timeout 15s (consulta de status é mais simples)
- Evita que instabilidade do Autentique trave todos os Lambdas em paralelo

CRIT-002 — lib/actions/vacancies.ts + /api/app/vagas GET: paginação:
- getVacancies(): adicionado take/skip/page, select em vez de include completo
- FRANQUEADORA sem filtro retornava TODAS as vagas (2000+ a 100 franqueados)
- /api/app/vagas GET atualizado para aceitar ?page e ?limit (max 100)

ALTO-A — franqueados/[id] GET: contracts com take:50 + select seguro:
- Era include { student: true, company: true } sem take — centenas de contratos
- Agora: select apenas campos necessários + take: 50
- Front-end usa /api/app/contratos para listagem completa paginada

ALTO-B — lib/actions/vacancies.ts getVacancy(): applications com take:150:
- Era include { student: { include: { user: true } } } sem take
- Agora: select sem user (dados essenciais apenas) + take: 150

ALTO-C — lib/rate-limit.ts: rate limiting in-memory para rotas públicas:
- Nova lib: checkRateLimit(ip, key, max, windowMs) com Map sliding window
- /api/public/estudante: 5/min por IP (bcrypt + email = operação cara)
- /api/public/lead: 10/min por IP
- /api/auth/forgot-password: 3/min por IP (mais restritivo — bcrypt + email)
- Limpeza automática a cada 5min para evitar memory leak

ALTO-D — processos/candidatar: autenticação e ownership:
- Rota estava 100% aberta sem getServerSession
- ESTUDANTE: só pode candidatar o próprio studentId
- EMPRESA: bloqueada (sem permissão)
- FRANQUEADO/FUNCIONARIO: só estudantes da própria franquia
- FRANQUEADORA: acesso total" 2>&1

echo ""
echo "🚀 Enviando para GitHub..."
git push origin main

echo ""
echo "=================================================="
echo "  ✅ PUSH CONCLUIDO — Vercel build iniciado"
echo "=================================================="
echo ""
echo "Acompanhe: https://vercel.com/dashboard"
echo ""
read -p "Pressione Enter para fechar..."
