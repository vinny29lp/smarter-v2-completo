#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 Limpando locks do git..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock .git/gc.pid.lock 2>/dev/null

echo "📝 Adicionando arquivos alterados..."
git add \
  app/api/app/empresas/[id]/route.ts \
  app/api/app/empresas/[id]/email/route.ts \
  app/api/app/empresas/route.ts \
  app/api/app/estudantes/[id]/route.ts \
  app/api/app/estudantes/route.ts \
  app/dashboard/empresas/[id]/EmpresaActions.tsx \
  app/dashboard/empresas/page.tsx \
  app/dashboard/estudantes/page.tsx \
  app/favicon.ico \
  app/login/page.tsx \
  middleware.ts

echo "📋 Status dos arquivos adicionados:"
git status --short

echo ""
echo "🚀 Criando commit..."
git commit -m "fix: 6 correções — excluir empresa/estudante, filtros, email modal, avaliação callback, favicon"

echo ""
echo "📤 Enviando para GitHub (Vercel fará deploy automático)..."
git push origin main

echo ""
echo "✅ Concluído! O Vercel vai fazer o deploy automaticamente."
echo "Acompanhe em: https://vercel.com/dashboard"
echo ""
read -p "Pressione Enter para fechar..."
