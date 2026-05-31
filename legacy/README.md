# /legacy

Código antigo ou substituído, mantido por referência.

## Regras

- Nada aqui é importado pela aplicação ativa
- Arquivos movidos para cá devem ter o motivo documentado no commit/PR
- Quando confirmar que não é mais necessário (após algumas semanas em produção), pode deletar

## Estrutura recomendada

```
legacy/
├── README.md
├── components-antigos/
├── apis-substituidas/
├── pages-removidas/
└── migrations-descontinuadas/
```

Esta pasta será populada nas Etapas 3 (Reorganização) e 5 (Correção).
