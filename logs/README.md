# /logs

Logs gerados por scripts e operações de manutenção.

Conteúdo desta pasta é **ignorado pelo git** (adicionar `logs/*.log` no `.gitignore`).

## Tipos de log esperados

- `backup-AAAAMMDD-HHMMSS.log` — log do script de backup
- `migration-AAAAMMDD-HHMMSS.log` — log de migrations Prisma
- `deploy-AAAAMMDD-HHMMSS.log` — log de deploy
- `audit-AAAAMMDD-HHMMSS.log` — auditorias de rotas/APIs

Mantenha os últimos 30 dias, depois pode limpar.
