# KNOWN ISSUES V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026
**Status:** Documentados e aceitos para piloto. Nenhum impede o funcionamento do sistema.

---

## LIMITAÇÕES ATUAIS

### L1 — Sem rate limiting nas rotas públicas
**Impacto:** As rotas `/api/public/*` (cadastro de estudante, empresa, lead) e `/api/auth/forgot-password` não têm rate limiting. Vulneráveis a spam de cadastros e brute-force de recuperação de senha.
**Risco:** MÉDIO (em escala com usuários maliciosos)
**Mitigação atual:** Dados mínimos necessários, bcrypt torna brute-force lento, IP dos logs disponível
**Solução:** Implementar `@upstash/ratelimit` com Redis (2-4h de desenvolvimento)

### L2 — `ignoreBuildErrors: true` no next.config.mjs
**Impacto:** Erros TypeScript são ignorados no build. Bugs de tipagem chegam silenciosamente a produção.
**Risco:** BAIXO (erros são de UI, não de lógica de negócio crítica)
**Mitigação atual:** APIs críticas foram revisadas manualmente
**Solução:** Rodar `npm run build` sem a flag, corrigir todos os warnings TypeScript, remover a flag

### L3 — Sem monitoramento de erros em tempo real
**Impacto:** Erros em produção só são descobertos quando usuários reclamam ou via Vercel logs manual
**Risco:** BAIXO-MÉDIO (atrasos na detecção de problemas)
**Solução:** Integrar Sentry.io ou Axiom (configuração de 1-2h)

### L4 — JWT sem rotação (refresh token)
**Impacto:** Token comprometido permanece válido por até 30 dias
**Risco:** BAIXO (requer comprometimento físico do dispositivo do usuário)
**Solução:** Implementar refresh token rotation no NextAuth

### L5 — `GET /franqueados/[id]` carrega contratos sem paginação
**Impacto:** Em franquias com 100+ contratos, a resposta pode ser muito grande e lenta
**Risco:** BAIXO em piloto (volumes baixos)
**Solução:** Adicionar `take: 50` + cursor pagination na listagem de contratos do endpoint

### L6 — PDFs assinados sem cópia própria
**Impacto:** PDFs assinados ficam apenas no Autentique. Se o Autentique ficar fora, os documentos ficam inacessíveis
**Risco:** BAIXO-MÉDIO
**Solução:** Após assinatura completa, fazer download automático e salvar no Supabase Storage

### L7 — Sem mecanismo de exclusão de dados pelo titular (LGPD)
**Impacto:** Estudantes e empresas não podem solicitar exclusão própria via plataforma
**Risco:** BAIXO em piloto (volume pequeno, pode ser feito manualmente pelo admin)
**Solução:** Implementar botão "Excluir minha conta" no portal do estudante/empresa

### L8 — ActivityLog sem TTL/arquivamento
**Impacto:** Tabela crescerá indefinidamente
**Risco:** BAIXO em piloto; MÉDIO em 2+ anos de operação
**Solução:** Job mensal de arquivamento de logs > 180 dias

---

## MELHORIAS FUTURAS CONHECIDAS

### M1 — Dashboard sem cache
As queries de KPIs do dashboard (6 COUNTs simultâneos) são executadas a cada carregamento de página. Em escala com muitos usuários simultâneos, pode aumentar a latência.
**Solução:** Redis/Upstash cache com TTL de 5 minutos

### M2 — Paginação de contratos no detalhe do franqueado
A tela de detalhes do franqueado (`/franqueados/[id]`) carrega todos os contratos sem paginação.

### M3 — Sem testes automatizados
O sistema não tem testes unitários ou E2E. Mudanças dependem de teste manual.
**Solução:** Playwright para E2E nos fluxos críticos

### M4 — Geração de PDF server-side sem cache
PDFs de currículo e documentos são gerados server-side a cada requisição.

### M5 — Sem busca full-text
Buscas de empresas, estudantes e contratos são feitas com `contains` no Prisma. Para grandes volumes, busca full-text com índices GIN seria mais eficiente.

---

## RISCOS MÉDIOS RESTANTES (da auditoria de segurança)

| ID | Descrição | Quando corrigir |
|----|-----------|----------------|
| SEC-M02 | Rate limiting nas APIs públicas | Sprint pós-piloto |
| SEC-M04 | ignoreBuildErrors no next.config | Sprint de qualidade |
| ESCAL-M01 | Paginação em /franqueados/[id] | Sprint de escalabilidade |

---

## ITENS OPCIONAIS (roadmap)

- App mobile (React Native ou PWA)
- Integração com sistemas de recrutamento (ATS)
- Dashboard de BI com métricas avançadas
- Geração de relatórios em Excel
- Sistema de chat interno
- Assinatura digital via certificado ICP-Brasil (A1/A3)
- Integração com e-SOCIAL para estágios obrigatórios

---

*Smarter Estágios — Known Issues V1 — 02/06/2026*
