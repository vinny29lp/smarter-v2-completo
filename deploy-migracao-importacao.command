#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivos ==="
git add \
  prisma/schema.prisma \
  app/api/app/estudantes/importar/route.ts \
  app/api/app/contratos/\[id\]/migrar/route.ts \
  app/api/app/contratos/\[id\]/ativar-migracao/route.ts \
  components/estudantes/ImportarEstudantesModal.tsx \
  components/estudantes/ImportarEstudantesButton.tsx \
  app/dashboard/estudantes/page.tsx \
  app/dashboard/contratos/\[id\]/page.tsx
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "feat: Módulo Migração — importação estudantes Excel + migração estágios ativos

MÓDULO 1 — Importação de Estudantes via Excel:
- Botão 'Importar Estudantes' na página de estudantes
- Modal com upload XLSX/XLS/CSV (SheetJS via CDN)
- Mapeamento automático de colunas (nome, cpf, email, etc.)
- Pré-visualização: total, válidos, com erro
- Validação: email obrigatório, CPF/email duplicado
- Importação em lotes de 20 com barra de progresso
- Relatório final: importados/duplicados/erros + download CSV
- API POST /api/app/estudantes/importar
- Log de importação salvo na tabela import_logs

MÓDULO 2 — Migração de Estágios Ativos:
- Seção exclusiva para FRANQUEADORA (Admin) no detalhe do contrato
- Upload TCE assinada (PDF) — armazenada como base64
- Botão 'Ativar Estágio' sem gerar nova TCE nem fluxo de assinatura
- Status ATIVO sem exigir assinatura digital
- Badge MIGRADO no título do contrato
- Exibe: Origem, Data da migração, Responsável, TCE para download
- API POST /api/app/contratos/[id]/migrar
- API POST /api/app/contratos/[id]/ativar-migracao

DB:
- contracts: +origem, +migradoEm, +migradoPor, +migradoPorNome, +tceMigradaUrl
- nova tabela import_logs
- schema.prisma atualizado + modelo ImportLog"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
