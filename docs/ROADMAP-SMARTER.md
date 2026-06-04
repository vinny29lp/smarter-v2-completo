# ROADMAP — SMARTER ESTÁGIOS
**Versão base:** stable-v1 | **Data:** 02/06/2026
**Estado atual:** Piloto controlado com até 5 franqueados

---

## CURTO PRAZO (próximos 30-60 dias após estabilização do piloto)

### Saúde e Segurança
- [ ] **Rate limiting** nas rotas públicas (cadastro, forgot-password) — `@upstash/ratelimit`
- [ ] **Remover `ignoreBuildErrors`** após corrigir warnings TypeScript
- [ ] **Monitoramento de erros** com Sentry.io — alertas em tempo real para erros 500
- [ ] **Cópia local dos PDFs assinados** — download automático no Autentique → Supabase Storage após assinatura

### Melhorias de Estabilidade
- [ ] **Paginação em `/franqueados/[id]`** — contratos com `take: 50` + cursor
- [ ] **Testes E2E básicos** com Playwright — login, criação de contrato, geração de TCE
- [ ] **`.env.example`** documentando todas as variáveis de ambiente necessárias
- [ ] **Tag Git stable-v1** — `git tag -a stable-v1 1d21b71 && git push origin stable-v1`

### Operacional
- [ ] **Onboarding dos primeiros 3 franqueados piloto**
- [ ] **Monitorar ActivityLog** — revisar ações dos primeiros 30 dias
- [ ] **Treinar os franqueados** no uso da plataforma

---

## MÉDIO PRAZO (60-180 dias)

### Escalabilidade
- [ ] **Redis/Upstash cache** para dashboard KPIs — TTL de 5 minutos, redução de latência
- [ ] **Cursor-based pagination** em listagens com >1.000 registros
- [ ] **Busca full-text** com índices GIN para empresas, estudantes e contratos
- [ ] **Queue de emails** para envios em massa (cobranças, avaliações)

### Segurança e Conformidade
- [ ] **JWT rotation** (refresh token) — reduzir janela de comprometimento de 30 para 1 dia
- [ ] **Mecanismo de exclusão de dados** pelo titular (LGPD Art. 18)
- [ ] **Política de retenção de logs** — arquivamento de ActivityLog > 180 dias
- [ ] **CSP (Content Security Policy)** — após inventário completo de scripts inline

### Produto
- [ ] **Dashboard financeiro avançado** — gráficos de receita por franquia, inadimplência
- [ ] **Relatório gerencial PDF** — exportar dados do dashboard em relatório mensal
- [ ] **Importação de contratos** em massa via Excel (além de estudantes)
- [ ] **Notificações in-app** e por email — vencimento de contratos, avaliações pendentes
- [ ] **App mobile / PWA** — acesso dos estudantes e empresas via smartphone
- [ ] **Gamificação completa** — ranking público de franqueados com premiação

### IA
- [ ] **Análise automática de currículos** vs vaga — matching com score detalhado
- [ ] **Sugestão de candidatos** para vaga com base em DISC + histórico
- [ ] **Geração automática de plano de estágio** com base nas atividades e área

---

## LONGO PRAZO (6-18 meses)

### Expansão da Plataforma
- [ ] **BI integrado** — Metabase ou Tableau conectado ao Supabase para análises avançadas
- [ ] **Integração e-SOCIAL** — envio automático de dados de estágios obrigatórios
- [ ] **Assinatura ICP-Brasil (A1/A3)** — para franqueados que precisam de validade jurídica avançada
- [ ] **Portal de vagas público** — site indexado pelo Google com as vagas abertas da rede
- [ ] **API pública** — para integração com sistemas de RH das empresas parceiras

### Multi-produto
- [ ] **Módulo de aprendizado** — trilhas de capacitação para estagiários
- [ ] **Módulo de employer branding** — perfil público da empresa no portal de vagas
- [ ] **Marketplace de talentos** — banco de currículos compartilhado entre franquias (opt-in)

### Infraestrutura
- [ ] **Multi-região** — replicação do banco para outras regiões (RJ, RS, CE)
- [ ] **DR (Disaster Recovery)** — procedimento automatizado de failover
- [ ] **SLA formal** — definição de uptime garantido por contrato para franqueados

---

## ESTADO ATUAL DE MÓDULOS

| Módulo | Status | Observação |
|--------|--------|-----------|
| Autenticação | ✅ Produção | Completo |
| Dashboard KPIs | ✅ Produção | Completo |
| Empresas (CRUD) | ✅ Produção | Completo |
| Estudantes (CRUD) | ✅ Produção | Completo |
| Contratos / TCE | ✅ Produção | Completo |
| Documentos jurídicos | ✅ Produção | 11 tipos de documento |
| Assinatura digital | ✅ Produção | Via Autentique |
| Financeiro | ✅ Produção | Completo |
| CRM | ✅ Produção | Completo |
| Processos seletivos | ✅ Produção | Completo |
| Vagas | ✅ Produção | Completo |
| Instituições | ✅ Produção | Completo |
| Equipe/Funcionários | ✅ Produção | Completo |
| Portal empresa | ✅ Produção | Completo |
| Portal estudante | ✅ Produção | Completo |
| IA (OpenAI) | ✅ Produção | 5 funcionalidades |
| DISC comportamental | ✅ Produção | Completo |
| Currículo PDF | ✅ Produção | Completo |
| Migração de estágios | ✅ Produção | Completo |
| Importação Excel | ✅ Produção | Completo |
| Gamificação | ✅ Beta | Básico funcional |
| Rate limiting | ❌ Pendente | Próxima sprint |
| Cache Redis | ❌ Pendente | Médio prazo |
| Testes E2E | ❌ Pendente | Médio prazo |
| App mobile | ❌ Pendente | Longo prazo |
| BI / Analytics | ❌ Pendente | Longo prazo |

---

*Smarter Estágios — Roadmap — 02/06/2026*
