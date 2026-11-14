# Auditoria final — Sistema Smarter (14/11/2026)

Resultado do plano de melhoria "funcionários digitais". Este documento descreve **como o sistema está a partir de agora**,
o que é automático, o que cada perfil precisa fazer e o que ainda pede ajuste.

---

## 1. Desenho do sistema

```
                          ┌────────────────────────── CRON (Vercel) ──────────────────────────┐
                          │  09h BRT  lia-automacoes   (teto 120 e-mails/dia, opt-out LGPD)    │
                          │  a cada 30 min  alizo-sync (leads Maps, eventos, Recrutador)       │
                          │  + cleanup, lembretes-atraso, boletos Cora, fechar-mes, support    │
                          └──────────────┬─────────────────────────────┬───────────────────────┘
                                         │                             │
                    ┌────────────────────▼───────────┐     ┌───────────▼─────────────────────┐
                    │  LIA (e-mails automáticos)     │     │  ALIZO (funcionários digitais)  │
                    │  • assinatura pendente  (#14)  │     │  • Sales Rep: WhatsApp          │
                    │  • renovação 90/60/30   (#17)  │     │  • Prospecção Google Maps       │
                    │  • avaliação 30/90/180  (#19)  │     │  • Recrutador (vagas/candidatos)│
                    │  • follow-up CRM ≤3     (#2)   │     │  Webhook assinado ◄── eventos   │
                    │  • reativação empresas  (#3)   │     │  (mensagens, negócio ganho)     │
                    │  • ativação do portal   (#5)   │     └───────────┬─────────────────────┘
                    │  • convite shortlist  (#7/#8)  │                 │
                    │  • lembrete entrevista  (#10)  │                 │
                    └────────────────┬───────────────┘                 │
                                     │ registra cada envio             │ grava notas/etapas
                                     ▼                                 ▼
        ┌─────────────────────────────────────────────────────────────────────────────────┐
        │  BANCO (Supabase)  automacao_envios · contatos_optout · metas_unidade · lixeira │
        │                    alizo_unidades · alizo_eventos · crm_leads.alizoLeadId       │
        │                    applications.etapaChangedAt · vacancies.alizoJobId           │
        └───────────────────────────────┬─────────────────────────────────────────────────┘
                                        │
   ┌────────────────────────────────────▼─────────────────────────────────────────────────┐
   │ TELAS                                                                                │
   │ FRANQUEADO / FUNCIONARIO: Hoje ☀️ (#1) · Central de Ações (Lia) · Contratos travados │
   │   (#15) · Resultados (#22) · Processos seletivos (lote, parados #10) · Vaga + sugeri-│
   │   dos (#7) · Motivo de rescisão obrigatório (#18)                                    │
   │ FRANQUEADORA: tudo acima em visão de rede · Funcionários digitais 🤖 · Lixeira 🗑️(#27)│
   │ ESTUDANTE: caixa de autorização de contato ao se inscrever (consentimento p/ Recrut.)│
   │ EMPRESA: portal (documentos, avaliações, financeiro) — a Lia empurra o 1º acesso     │
   └──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. O que é automático (nenhuma unidade precisa fazer nada)

| Função | Quando dispara | Quem recebe | Limites |
|---|---|---|---|
| Lembrete de assinatura (#14) | TCE enviado e não assinado há 2+ dias; depois a cada 3 dias | Signatário pendente | máx. 4 lembretes por documento |
| Renovação 90/60/30 (#17) | Contrato ativo perto do fim (marcos) | Empresa + aviso à unidade | 1 por marco; não renova após 2 anos de estágio |
| Avaliação 30/90/180 (#19) | Contrato ativo nos marcos | Empresa (link do portal) | 1 por marco |
| Follow-up CRM (#2) | Lead em primeiro contato/apresentação/proposta/negociação, passado o prazo da etapa | Lead **com optIn e e-mail** | até 3, a cada 4 dias; 15/dia/unidade |
| Reativação de empresas (#3) | Empresa ativa, sem contrato e sem vaga aberta, cadastrada há 30+ dias | E-mail da empresa | a cada 45 dias, máx. 3; 25/dia |
| Ativação do portal (#5) | Empresa com estágio ativo cujo usuário nunca entrou | Usuário da empresa | a cada 10 dias, máx. 3; 25/dia |
| Convite de vagas (#8) | Vaga aberta há 2–30 dias com menos de 3 candidatos e com link público | Top 5 estudantes disponíveis (score ≥ 50) | 3 convites/semana por estudante; nova rodada só após 10 dias |
| Lembrete de entrevista (#10) | Etapa "entrevista" com data marcada, 18–30 h antes | Estudante | 1 por entrevista |
| Aviso "A Lia trabalhou por você" | Após cada rodada em que enviou algo | Franqueado (sino) | — |
| Alertas e Central de Ações | Ao abrir o sistema | Franqueado/funcionário | modal 1x por dia + chip |
| Sincronização Alizo | A cada 30 min | — | Maps → CRM; eventos; vagas/candidatos |

Garantias comuns: cada envio fica em `automacao_envios` (sem repetir), respeita o opt-out por link no rodapé,
teto total de 120 e-mails por execução, e `LIA_AUTOMACOES_DESLIGADO=true` desliga tudo na Vercel.

---

## 3. O que cada perfil precisa fazer

### Franqueado / Funcionário
1. **Definir a meta do mês** em *Hoje ☀️* (sem meta, o sistema usa a média dos 3 meses + 10%). Só o franqueado edita.
2. **Marcar consentimento (optIn) nos leads do CRM** — sem ele a Lia **não** faz follow-up.
3. **Preencher as vagas**: curso requerido, cidade e DISC melhoram o matching e os convites. Vaga sem link público não gera convite.
4. **Agendar a entrevista** (data + etapa "entrevista") para o lembrete sair.
5. **Mover candidatos** — o sistema alerta inscritos parados há 5+ dias e triagem/entrevista há 7+ dias. Pode mover vários de uma vez (caixas "Selecionar" no kanban).
6. **Informar o motivo** ao rescindir contratos (obrigatório).
7. Manter estudantes com status **Disponível** (só eles recebem convites).

### Franqueadora
1. Ver **Hoje na rede** (ranking por unidade) e **Funcionários digitais 🤖** (status da integração).
2. **Lixeira**: restaurar estudante/empresa excluído em até 90 dias.
3. **Mapear cada franquia à unidade da Alizo** (tabela `alizo_unidades`) — sem isso a unidade não usa a Alizo. Hoje só Matriz e a unidade de teste RJ estão mapeadas.
4. Decidir quando ligar o gatilho CRM → Alizo (`ALIZO_GATILHO_LEADS_ATIVO`, hoje desligado).

### Estudante
- Ao se inscrever, pode **marcar a autorização** de contato do assistente digital. Sem a marca, nenhum dado vai à Alizo.

### Empresa
- Recebe e-mails de renovação, avaliação, reativação e orientação do portal. Usa o link de descadastro quando quiser.

---

## 4. Estado das integrações (hoje)

| Peça | Estado |
|---|---|
| Chave, URL e segredo do webhook (Vercel) | Configurados |
| Webhook assinado | Ativo — recebe `lead.message.sent/received`, valida HMAC e não repete evento |
| WhatsApp (Sales Rep) | Envio real validado (201, `Idempotency-Key` repetida = sem duplicar) |
| Google Maps | Perfil da Matriz já existia; leads importados ao CRM |
| Recrutador | **Ligado** (`ALIZO_RECRUTADOR_ATIVO=true`) — só unidades mapeadas (hoje só a de teste RJ) e só candidatos com consentimento |
| Gatilho CRM → Alizo | **Desligado** (aguarda decisão) |

---

## 5. Testes executados nesta auditoria

- `tsc` sem erros · 244 testes unitários passando · build de produção concluído.
- Produção: rotas novas e cron respondem **401** sem login/segredo; webhook responde 401 sem assinatura; páginas públicas respondem 200; token de descadastro inválido é recusado.
- Banco: RLS ativa em todas as tabelas novas; sem resíduos de teste.
- Lixeira: ciclo apagar → restaurar validado para estudante e empresa (com usuário); restaurar 2x é recusado.
- Alizo: autenticação (200/401), lead duplicado, mensagem real + idempotência, webhook recebendo eventos reais, vaga criada uma única vez, 38 candidatos bloqueados por falta de consentimento.
- Lia em simulação (sem enviar): 80 envios previstos (24 reativações, 25 portal, 25 convites, 4 avaliações, 1 renovação, 1 CRM).
- Logs da Vercel nas últimas 3 h: **nenhum erro**.

**Limite desta auditoria:** não foi possível entrar com cada perfil (franqueado, funcionário, franqueadora) para testar as telas
no navegador. As regras de acesso foram conferidas no código. Recomenda-se abrir *Hoje*, *Funcionários digitais*,
*Processos seletivos* e *Lixeira* uma vez com cada login.

---

## 6. Pontos que ainda pedem ajuste

1. **CRM sem consentimento**: só 5 dos 75 leads têm optIn + e-mail — o follow-up automático quase não dispara. Falta coletar o optIn nos formulários/cadastro de lead.
2. **Vagas incompletas**: 9 de 32 vagas abertas sem curso requerido (matching fraco) e 2 sem link público (sem convite).
3. **Alizo nas 10 franquias reais**: não mapeadas; cada uma precisa de unidade criada na Alizo (com WhatsApp) e do mapeamento.
4. **Primeira rodada grande**: amanhã (09h) saem ~80 e-mails de uma vez. Se preferir começar mais devagar, reduzo os tetos.
5. **Lixeira**: não cobre exclusão de franquia inteira nem a rota admin `reset-data`.
6. **Revogação de consentimento** do estudante: não há tela (só a caixa na inscrição).
7. **Portal da empresa**: 241 empresas com usuário que nunca entrou — a Lia vai trabalhar nisso, mas vale conferir se o fluxo "esqueci minha senha" funciona de ponta a ponta.
8. **Vagas de teste na Alizo** ("[TESTE INTEGRACAO] Estagiário de Direito" e "Suporte Administrativo"): a API não tem exclusão; apagar no painel da Alizo.
9. Menu do **Funcionário** não tem o item "Hoje" (acessa por `/dashboard/hoje`).
10. Pendências antigas: decisão sobre PITR do Supabase, reemissão do TCE da Liliane, efeito do bloqueio de 33 dias.
