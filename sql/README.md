# /sql

Scripts SQL para Supabase: setup inicial, seeds, migrations manuais, queries de manutenção.

## Arquivos existentes na raiz do projeto

- `supabase-setup.sql` (raiz) — script de setup inicial do Supabase
- `supabase-seed.sql` (raiz) — dados iniciais

**TODO** (futura organização): mover esses arquivos da raiz para esta pasta.

## Estrutura recomendada

```
sql/
├── README.md
├── setup/
│   └── 001-initial-schema.sql
├── seeds/
│   └── 001-default-data.sql
├── migrations/
│   └── 2026-XX-XX-descricao.sql
└── queries/
    └── manutencao-financeiros.sql
```
