#!/bin/bash
cd "/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"

# Limpar locks residuais
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

# Commit da correcao do painel de saude
git add app/api/app/saude/route.ts
git commit -m "fix: remove query custoEstimado inexistente na tabela ai_usage_logs

Coluna custoEstimado existe no schema.prisma mas migration nunca foi
aplicada ao Supabase. Tabela real ai_usage_logs possui apenas: id,
franchiseId, userId, tipoUso, prompt, resultado, tokens, createdAt.

A query SUM(custoEstimado) causava erro PostgreSQL 42703 que era
retornado como HTTP 500.

Retorna custoAiHojeTotal=0 ate migration. Queries validadas no Supabase."

# Push para Vercel
git push origin main

echo ""
echo "Commit e push concluidos! Vercel fara o deploy automaticamente."
echo "Pressione Enter para fechar..."
read
