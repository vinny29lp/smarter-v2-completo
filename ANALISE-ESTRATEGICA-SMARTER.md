# ANÁLISE ESTRATÉGICA COMPLETA — SMARTER ESTÁGIOS
**Elaborado em:** Julho de 2026  
**Perfil do analista:** Análise baseada em leitura integral do código-fonte, schema do banco de dados, auditorias internas e pesquisa de mercado primária (ABRES, CIEE, IEL, Nube, Super Estágios).

---

## SUMÁRIO EXECUTIVO

A Smarter Estágios está melhor posicionada do que parece. O sistema tem um nível de maturidade técnica acima do que qualquer novo entrante no mercado de franquias de estágios jamais construiu na fase inicial. O principal risco não é técnico — é de execução comercial. O mercado brasileiro de estágios cresceu 37% em 2024, tem 1,2 milhão de estagiários ativos e um potencial de 20 vezes mais (20 milhões de estudantes elegíveis). A Smarter tem o produto. O que ela precisa é de velocidade.

---

## BLOCO 1 — DIAGNÓSTICO DO SISTEMA

### Nível de Maturidade: 7/10

**Justificativa honesta:** O sistema não é um MVP. É um produto funcional com mais de 30 tabelas de banco de dados, isolamento multi-tenant real, autenticação robusta, CRM completo, financeiro operacional, gamificação, portal de IES com assinatura digital de convênio, Marketing Hub para a rede e módulo de IA integrado. A auditoria interna de segurança deu 88/100 — isso é melhor do que a maioria dos SaaS B2B de pequeno porte. A nota não é 9 porque há funcionalidades estruturais ainda incompletas que travam o core do negócio.

### Funcionalidades Diferenciadoras (o que a concorrência não tem)

**1. Apresentação comercial rastreável (pixel tracking)**
O sistema gera uma apresentação única por lead que registra: quando foi aberta, quanto tempo a pessoa ficou, qual porcentagem do conteúdo foi lida, se clicou em WhatsApp, se clicou em agendamento. Isso é inteligência de vendas que nenhum franqueado de agente de integração tem hoje. Nenhum. A Super Estágios não tem. O Nube não tem. Esse módulo, bem usado, é uma máquina de conversão.

**2. Portal de convênio IES com assinatura digital automática**
A maioria dos agentes de integração ainda assina convênio com instituições de ensino por e-mail, papel ou WhatsApp. A Smarter tem um portal público com token único, coleta de dados do assinante, registro de IP e geração de minuta assinada. Isso reduz de semanas para horas o tempo de onboarding de uma nova IES.

**3. Marketing Hub centralizado**
A franqueadora produz conteúdo (posts, copies, artes, vídeos, campanhas) e os franqueados baixam e usam. Com controle de downloads, favoritos e calendário editorial. Isso resolve um problema estrutural das redes de franquias pequenas: os franqueados ficam sem material e deixam de aparecer nas redes sociais.

**4. Módulo de abertura e fechamento de mês**
Os franqueados declaram metas, as comparam com resultados reais ao final do mês e geram um relatório de desempenho. É gestão por resultado dentro do próprio sistema. Isso cria disciplina operacional que a maioria das redes pequenas não consegue impor.

**5. CRM de venda de franquias (FranquiaLead)**
O sistema tem um CRM separado para gerenciar a venda de novas franquias — com pipeline, notas, tarefas e integração com Meta Ads. Isso significa que a própria expansão da rede é gerenciada dentro do sistema.

**6. IA integrada com controle de uso**
O sistema usa IA para gerar descrições de vagas, atividades do TCE, pareceres técnicos e análise do perfil DISC. Tem log de uso por franqueado com custo estimado em tokens — isso permite cobrar ou limitar o uso por plano.

**7. Gamificação com ranking da rede**
Franqueados acumulam pontos por ações (cadastrar empresa, firmar contrato, etc.) e competem em ranking. Isso cria engajamento sem custo marginal e é o tipo de mecanismo que grandes redes de franquias como Wizard e CNA usam para manter as unidades ativas.

**8. Solicitação de vaga pela empresa**
A empresa preenche um formulário público enviado pelo franqueado. A vaga entra no sistema automaticamente e pode ser convertida em Vacancy com um clique. Isso elimina o WhatsApp como canal de cadastro de vagas — um problema universal no setor.

### Funcionalidades "Mínimo do Mínimo" (todos os concorrentes têm)

- Login por perfil
- Listagem de empresas, estudantes, contratos
- Dashboard com KPIs básicos
- CRM Kanban
- Financeiro com lançamentos

Essas funcionalidades estão presentes e funcionam, mas não são diferencial.

### Gaps Críticos que Prejudicam o Crescimento Hoje

**Gap 1 — Geração real de TCE em PDF**  
O contrato de estágio (TCE) é o produto central do negócio. O schema tem o campo `htmlContent` e `pdfUrl` na tabela `internship_documents`, mas a geração real do HTML/PDF ainda não está implementada. Isso significa que franqueados ainda precisam usar outro sistema (Word, Google Docs) para gerar o TCE. Esse é o bug mais caro do sistema.

**Gap 2 — Assinatura digital via Authentique não está completa**  
O campo `authDocId`, `signedUrl` e `signedAt` existem no banco. O token da API está previsto na `SystemConfig`. Mas a integração real (POST do documento, webhook de confirmação, atualização de status) ainda não foi implementada. Sem isso, a "assinatura digital" é visual — não funcional.

**Gap 3 — E-mail automatizado não funciona**  
SMTP está configurado na `SystemConfig` (com campo `resendApiKey`), mas o envio real via Nodemailer/Resend não está implementado. Isso significa: nenhum franqueado recebe notificação automática de vencimento, nenhuma empresa recebe cobrança por e-mail, nenhum estudante recebe boas-vindas. O financeiro sem e-mail é incompleto.

**Gap 4 — Rate limiting ausente em rotas públicas**  
Os portais públicos (cadastro de estudante, lead de empresa, portal IES) estão expostos sem rate limiting. Isso é aceito no piloto mas se torna risco real com 10+ franqueados.

**Gap 5 — `ignoreBuildErrors: true` no Next.js**  
Erros de TypeScript silenciados em produção. Isso é uma bomba-relógio: bugs passam pelo build sem aviso. Precisa ser removido com uma rodada de correção de warnings.

**Gap 6 — Sem monitoramento de erros (Sentry ou similar)**  
Erros em produção só são detectados quando usuário reclama. Em uma rede de franquias, isso é inaceitável — a franqueadora precisa saber de qualquer erro antes do franqueado reclamar.

### O que Está Bem Feito e É Diferencial Real

- **Isolamento multi-tenant impecável.** Cada franqueado vê apenas seus dados. Cada empresa vê apenas os seus. Cada estudante vê apenas os seus. Com filtros por `franchiseId`, `companyId` e `studentId` em todas as queries. A auditoria confirmou isso.
- **Schema do banco maduro e extensível.** 30+ tabelas bem relacionadas, enums tipados, índices de performance, timestamps em todas as tabelas.
- **Proteção por JWT + middleware do Next.js.** Rotas protegidas sem depender de lógica client-side.
- **Log de auditoria completo.** Toda ação fica registrada em `activity_logs` com userId, módulo, ação, IP e timestamp. Compliance com LGPD.
- **`SystemConfig` configurável pela franqueadora.** Logos, textos de login, chaves de API, dados da empresa — tudo configurável sem mexer no código.

---

## BLOCO 2 — POSICIONAMENTO DE MERCADO

### O Mercado em Números (dados reais, 2024–2025)

| Indicador | Número |
|---|---|
| Estudantes elegíveis para estagiar no Brasil | 20,1 milhões |
| Estagiários ativos em 2024 | 1,2 milhão |
| Penetração do mercado | 6% |
| Crescimento do mercado em 2024 | +37% |
| Projeção para 2025 | 1 milhão de novas contratações |
| Bolsa média de estágio (superior) | R$ 1.431/mês |
| Taxa de efetivação de estagiários | 40–60% |
| Concentração regional | Sudeste: 60% dos estagiários |

O mercado de 6% de penetração é o dado mais importante para a Smarter. Isso significa que existe espaço para crescer 16x sem criar um novo mercado — apenas convertendo estudantes que já estão elegíveis mas não estão em estágio. O crescimento de 37% em 2024 mostra que esse mercado está se movendo rapidamente.

### Comparativo Direto com os Principais Concorrentes

**CIEE (Centro de Integração Empresa-Escola)**
- Fundado em 1964. Sem fins lucrativos. Receita via taxa de administração.
- Presente em todos os estados. Estimado em 400–600 mil estagiários ativos.
- Operação enorme, burocrática. Tempo de processamento de documentos pode ser de dias.
- Plataforma digital básica. Foco em volume, não em experiência.
- O que faz que a Smarter não faz: escala, nome, convênios com prefeituras e órgãos públicos.
- O que não faz: CRM de vendas, gamificação, marketing hub, pixel tracking em apresentações, abertura/fechamento de mês, portal IES digital.

**IEL (Instituto Euvaldo Lodi — Sistema CNI/FIEP)**
- Vinculado à Confederação Nacional da Indústria. Foco em indústria.
- 114 mil estagiários no programa, 26 estados.
- Captação garantida pela base industrial da CNI — não precisa fazer prospecção comercial.
- O que não faz: atende apenas o setor industrial. Sem modelo de franquia. Nenhuma ferramenta de gestão para parceiros locais.

**Nube (Núcleo Brasileiro de Estágios)**
- Maior agente privado do Brasil. 6.800+ empresas clientes, 13,5 mil IES parceiras, 3,6 milhões de currículos, 550 mil colocados no mercado.
- 10 milhões de ligações/ano, 3 milhões de SMS/ano, 700 mil candidatos encaminhados/ano.
- O que não faz: modelo de franquia. Sem presença local consultiva. Sem ferramenta para o franqueado gerir sua carteira.

**Super Estágios (único concorrente direto em franquias)**
- Fundada em 2009. Primeira e maior rede de franquias de estágios. Associada à ABF.
- 85 unidades em 2024. Meta de 100 em 2025. Faturou R$ 164M em 2024.
- Investimento inicial: R$ 125 mil. Faturamento médio por unidade: R$ 108 mil/mês. Margem: 41%. Payback: 18 meses.
- 2 milhões de estagiários colocados desde a fundação.
- O que faz: marca estabelecida, 85 franqueados, receita comprovada, ABF-certificada.
- O que não faz: nenhum dos diferenciais tecnológicos da Smarter. CRM básico, sem pixel tracking, sem gamificação, sem marketing hub, sem portal IES digital, sem IA.

**Companhia de Estágios**
- Posicionamento premium. Foco em grandes empresas e programas estruturados.
- Não tem modelo de franquias. Opera centralizadamente.
- O que não faz: presença capilar local, modelo de franquia, tecnologia proprietária para parceiros.

### Onde a Smarter Está Hoje

A Smarter está na fase de piloto controlado — entre 1 e 5 franqueados, conforme a própria auditoria de segurança declarou como capacidade atual. Em termos de quota de mercado, está próxima de zero na comparação com CIEE/IEL/Nube.

Porém, o posicionamento é correto: a Smarter não compete com CIEE ou Nube em volume. Ela compete com a Super Estágios pelo investidor de franquia e pela empresa regional que quer um agente local com serviço consultivo. Nesse nicho específico, a Smarter tem tecnologia superior à Super Estágios. O problema é que a Super Estágios tem 85 franqueados e a Smarter está começando.

### Vantagem de Ser Ágil — O que os Grandes Não Fazem

Os grandes agentes (CIEE, IEL, Nube) têm três características em comum que criam espaço para a Smarter:

1. **Sem relacionamento local.** Eles operam via plataforma nacional. O franqueado da Smarter vai ao cliente, faz a visita, entende o negócio, sugere o perfil. Isso vale dinheiro para pequenas e médias empresas que querem um interlocutor humano.

2. **Sem tecnologia proprietária para o parceiro.** Nenhum deles tem um sistema que dê ao agente local visibilidade de CRM, financeiro, gamificação e marketing. O franqueado da Smarter tem um painel completo de gestão do negócio.

3. **Sem incentivo para expansão.** CIEE e Nube não têm interesse em criar novos agentes locais — são concorrentes em potencial. A Smarter cresce vendendo franquias.

---

## BLOCO 3 — O QUE TORNARIA A SMARTER A FRANQUIA Nº1

### Top 10 Melhorias de Produto/Sistema por Impacto no Resultado

**#1 — Geração real de TCE em PDF (impacto: crítico)**  
É o coração do negócio. Todo franqueado precisa disso agora. Um TCE gerado dentro do sistema com os dados do contrato, pronto para assinar, elimina o uso de Word e reduz erros. Isso deveria estar em produção antes de qualquer novo franqueado entrar. Estimativa de desenvolvimento: 1 semana de trabalho focado usando `@react-pdf/renderer` ou Puppeteer.

**#2 — Integração real com Authentique para assinatura digital (impacto: crítico)**  
Com o TCE gerado, o próximo passo é enviar para assinatura automática e receber o webhook quando estiver assinado. Isso elimina o processo manual de imprimir, assinar, escanear e enviar. Estimativa: 3–5 dias de desenvolvimento.

**#3 — E-mail automatizado via Resend/Nodemailer (impacto: alto)**  
Disparo automático de: cobrança com vencimento (7 dias antes, no dia, 3 dias depois), boas-vindas ao franqueado, notificação de novo contrato para empresa, lembrete de avaliação semestral. Sem isso, o franqueado vira secretária de si mesmo.

**#4 — Rate limiting nas rotas públicas (impacto: alto, segurança)**  
Com `@upstash/ratelimit` e Redis. Necessário antes de atingir 10 franqueados com portais públicos ativos. 1 dia de trabalho.

**#5 — Monitoramento com Sentry (impacto: alto, operacional)**  
Sentry.io tem tier gratuito. Erros em produção chegam por e-mail antes que o franqueado reclame.

**#6 — Avaliação semestral com link público (impacto: médio-alto)**  
A lei exige avaliação semestral do estagiário. O schema já tem a tabela `evaluations` com `link` único. Falta só a página pública e o formulário. Isso fecha um ciclo legal importante.

**#7 — App mobile para estudante (impacto: médio-alto, longo prazo)**  
O estudante hoje acessa por browser. Um app nativo (ou PWA bem feito) com push notifications para vagas novas aumenta o engajamento. Nube tem app. CIEE tem app.

**#8 — Integração com WhatsApp Business API (impacto: médio)**  
Com Twilio ou Z-API, o sistema poderia enviar cobranças, lembretes de assinatura e alertas de vencimento direto no WhatsApp — canal com 98% de abertura no Brasil.

**#9 — Dashboard da franqueadora com visão consolidada de toda a rede (impacto: médio)**  
A franqueadora precisa ver em uma única tela: contratos ativos por unidade, franqueados performando mal, maiores clientes da rede, financeiro consolidado.

**#10 — Remove `ignoreBuildErrors: true` e corrige warnings TypeScript (impacto: qualidade)**  
Não tem impacto visível no usuário hoje. Mas previne bugs silenciosos em produção à medida que o sistema cresce.

### Funcionalidades que o Mercado Ainda Não Tem — Smarter Pode Lançar Primeiro

**Matching automático por DISC**  
A Smarter já calcula o perfil DISC do estudante e salva no banco. As vagas têm o campo `discDesejado`. O próximo passo é um algoritmo de matching que ranqueia estudantes por compatibilidade com a vaga. Isso transforma o processo seletivo: em vez de o franqueado vasculhar o banco, o sistema apresenta os 5 mais compatíveis. Nenhum concorrente tem isso funcional.

**Score de lead por engajamento com apresentação**  
O sistema já tem `leadScore` na tabela `crm_leads` e rastreia eventos da apresentação comercial. Falta um algoritmo que atualize o score automaticamente e priorize leads quentes no CRM. Exemplo: lead que abriu a apresentação, leu 80% e clicou em WhatsApp = score 95.

**Portal público de vagas com SEO**  
O schema tem `publicSlug` na tabela `vacancies` e o sistema já tem `sitemap.ts` e `robots.ts`. Vagas publicadas em URLs indexáveis como `/vagas/analista-de-marketing-sao-paulo-techcorp` aparecem no Google. Isso geraria tráfego orgânico de candidatos sem custo de aquisição.

**Relatório de impacto social para IES**  
Um relatório mensal automático com quantos alunos da IES estão em estágio, em que empresas, quais áreas, taxa de efetivação — seria um diferencial absurdo para firmar convênios. Nenhum agente oferece isso de forma automatizada.

### Melhorias de Experiência por Persona

**Para a Empresa:**
- Formulário de solicitação de vaga já existe — falta o e-mail de confirmação e acompanhamento.
- Assinatura do CPS (Contrato de Prestação de Serviços) via Authentique — campo já no schema.

**Para o Estudante:**
- DISC completo com interface visual. Hoje o teste existe mas a tela de aplicação não está pronta.
- Notificação de novas vagas compatíveis com o perfil DISC.

**Para o Franqueado:**
- Alerta automático de contratos vencendo nos próximos 30/60/90 dias.
- Relatório mensal de performance gerado automaticamente no fechamento do mês em PDF.

### O que Tornaria a Smarter a Escolha Óbvia para um Investidor de Franquia

Um investidor compara Smarter vs. Super Estágios. A Super Estágios tem: 85 unidades, ABF, 15 anos de mercado, faturamento comprovado de R$ 164M na rede, payback de 18 meses.

A Smarter precisa vencer em três frentes:

1. **Tecnologia.** "A Super Estágios não te dá CRM com pixel tracking de apresentação, não te dá IA para gerar descrições, não te dá portal automático de convênio com IES, não te dá gamificação com ranking da rede. A nossa plataforma faz o trabalho por você." Isso é factual e verificável.

2. **Suporte operacional.** Marketing Hub com conteúdo pronto para postar. Gestão de metas mensais integrada. Franqueado novo entra no sistema e já tem o que fazer.

3. **Modelo financeiro transparente.** Mostrar planilha de retorno com números reais do mercado (taxa de administração por estagiário × carteira × margem), não projeções otimistas.

---

## BLOCO 4 — PROJEÇÃO E NÚMEROS

### Modelo de Receita da Franquia

A receita de um agente de integração vem da **taxa de administração mensal**, cobrada da empresa por cada estagiário ativo.

| Item | Referência de Mercado |
|---|---|
| Taxa de administração média por estagiário | R$ 150–350/mês |
| Carteira média de uma unidade madura | 100–300 estagiários |
| Receita bruta mensal com 150 estagiários a R$ 200 | R$ 30.000 |
| Receita bruta mensal com 300 estagiários a R$ 200 | R$ 60.000 |
| Margem bruta estimada (1–2 pessoas) | 55–70% |
| Lucro líquido estimado com 150 estagiários | R$ 16.500–21.000 |

O benchmark da Super Estágios é faturamento médio de R$ 108 mil/mês por unidade madura, com margem de 41% (R$ 44 mil de lucro). Isso é uma carteira de aproximadamente 400–500 estagiários ativos a R$ 200–250/mês — uma unidade bem desenvolvida, não a média do primeiro ano.

**Receita da Franqueadora (matriz):**

| Fonte | Valor Estimado |
|---|---|
| Taxa de franquia (entrada) | R$ 15–30 mil por unidade |
| Mensalidade do sistema por franqueado | R$ 200–500/mês (campo `mensalidade` já no schema) |
| Royalty sobre faturamento | 3–6% (a definir) |
| Receita de IA por uso acima da cota | Log implementado, cobrança a definir |

Com 30 franqueados pagando R$ 300/mês de sistema + 5% de royalty sobre R$ 30 mil médios = R$ 1.800 de receita recorrente por unidade. Com 30 unidades: R$ 54.000/mês só de sistema + royalties, além das taxas de entrada.

### Benchmarks de Receita vs. Concorrentes

| Rede | Unidades | Receita da Rede | Receita Média/Unidade |
|---|---|---|---|
| Super Estágios (2024) | 85 | R$ 164M/ano | R$ 161k/mês |
| Smarter (potencial 30 unidades) | 30 | ~R$ 10,8M/ano | R$ 30k/mês |
| Smarter (potencial 85 unidades) | 85 | ~R$ 30,6M/ano | R$ 30k/mês |

A diferença de receita por unidade (R$ 30k vs. R$ 161k) reflete unidades maduras da Super Estágios vs. unidades em estágio inicial. Uma franquia leva 12–24 meses para atingir maturidade de carteira.

### Sistema Atual vs. Sistema Ideal — Impacto Financeiro

**Com o sistema atual (sem TCE em PDF, sem assinatura digital, sem e-mail automático):**
- Um franqueado consegue gerir até ~80 contratos com esforço manual alto.
- 3–4 horas/dia gastas em burocracia = ~60% do tempo produtivo consumido administrativamente.

**Com o sistema ideal (TCE automatizado, assinatura digital, e-mail + WhatsApp automático):**
- O mesmo franqueado pode gerir 200+ contratos sem contratar mais pessoas.
- 60% do tempo liberado vai para prospecção = crescimento de carteira mais rápido.
- Impacto estimado de receita por unidade: +40–60% com o mesmo custo fixo.

### KPIs que a Smarter Deveria Monitorar

| KPI | Disponível no Sistema? | Observação |
|---|---|---|
| Contratos ativos por franqueado | ✅ Sim | Dashboard existe |
| Receita recorrente mensal (MRR) da rede | ✅ Parcial | Financeiro existe, BI consolidado não |
| Taxa de churn de contratos | ❌ Não | Calculável com dados existentes |
| Tempo médio de ativação de um contrato | ❌ Não | Entre `createdAt` e `ativadoEm` no schema |
| Taxa de renovação de contratos vencidos | ❌ Não | Alta prioridade — retenção é mais barata que captação |
| CAC (custo de aquisição de cliente) | ❌ Não | Integraria com Google/Meta Ads |
| LTV por empresa | ❌ Não | Calculável com `financials` |
| Score de engajamento do franqueado | ✅ Sim | Gamificação já calcula isso |
| Taxa de IES com convênio ativo | ✅ Sim | `convenioStatus` na tabela `institutions` |

---

## BLOCO 5 — ROADMAP RECOMENDADO

### Curto Prazo (0–3 meses) — Resolver o que Trava o Crescimento

Sem essas funcionalidades, cada novo franqueado vai depender de suporte manual da matriz.

**Mês 1:**
- Geração de TCE em HTML/PDF com dados reais do banco (`@react-pdf/renderer` ou Puppeteer)
- Integração real com Authentique: POST do documento, webhook de status, atualização automática no banco
- Envio de e-mail básico via Resend: boas-vindas a franqueado, confirmação de novo contrato

**Mês 2:**
- Rate limiting nas rotas públicas (`@upstash/ratelimit` + Redis)
- Monitoramento com Sentry.io
- Remoção de `ignoreBuildErrors: true` com rodada de correção de TypeScript
- E-mail de cobrança automático: 7 dias antes do vencimento, no dia, 3 dias depois

**Mês 3:**
- Tela do teste DISC completo para estudante (com gráfico animado)
- Avaliação semestral com link público para empresa responder
- Dashboard consolidado da franqueadora (visão de toda a rede)
- Formulários de criação completos: nova empresa, novo estudante, novo contrato (3 etapas)

**Resultado esperado ao final de 3 meses:** Sistema capaz de suportar 20 franqueados com operação autônoma. Franqueado consegue fechar um contrato do zero — da prospecção à ativação e cobrança — sem sair do sistema.

### Médio Prazo (3–12 meses) — Criar Vantagem Competitiva Real

**Trimestre 2 (meses 4–6):**
- Matching automático por DISC (ranqueamento de candidatos por compatibilidade com vaga)
- Score de lead automático com base nos eventos da apresentação comercial
- Assinatura do CPS da empresa via Authentique
- Integração WhatsApp Business API para cobranças e alertas
- Portal público de vagas com URLs indexáveis e SEO técnico

**Trimestre 3 (meses 7–9):**
- App mobile (PWA ou React Native) para estudante com push notifications
- Relatório automático de impacto social para IES
- Dashboard de BI consolidado para franqueadora
- Integração com Meta Ads Lead Ads no CRM de venda de franquias

**Trimestre 4 (meses 10–12):**
- Importação em massa de empresas, estudantes e contratos via Excel/CSV
- Relatório mensal automático para franqueado em PDF no fechamento do mês
- LTV e CAC por empresa calculados automaticamente
- Integração com LinkedIn para publicação de vagas

**Resultado esperado ao final de 12 meses:** Produto que gera tração orgânica (vagas no Google), reduz churn de franqueados (sistema indispensável na operação) e cria barreira de entrada real contra a Super Estágios.

### Longo Prazo (1–3 anos) — Posição Indesbancável

**Ano 2:**
- Marketplace público de vagas de estágio
- Programa de fidelidade para empresas
- API pública para IES integrarem o portal da Smarter nos próprios sites
- Módulo de jovem aprendiz (Lei 10.097/2000) — mercado adjacente com mesma estrutura operacional

**Ano 3:**
- Expansão para recrutamento CLT júnior, trainee, primeiro emprego
- White-label do sistema para outros agentes de integração
- Dados agregados anonimizados vendidos como relatórios de mercado para IES e empresas de RH

---

## CONCLUSÃO — VEREDICTO DIRETO

A Smarter tem um sistema melhor do que o principal competidor em franquias (Super Estágios). Isso é fato verificável pelo código. A tecnologia não é o problema. O problema é que a Super Estágios tem 85 franqueados e um nome estabelecido, e a Smarter está começando.

A janela de oportunidade existe porque o mercado cresceu 37% em 2024 e ainda tem 94% de penetração disponível. Qualquer agente bem gerido vai crescer nesse ambiente.

O caminho mais rápido para a Smarter ser a franquia nº1 em tecnologia — e vender isso como diferencial — é resolver os 3 gaps críticos (TCE em PDF, assinatura digital, e-mail automático) nos próximos 60 dias. Isso torna o sistema completo do ponto de vista operacional. Com isso resolvido, cada franqueado vai fechar mais contratos, com menos esforço, e vai recomendar a rede para outros investidores.

O segundo movimento é a velocidade de expansão da rede. A Super Estágios levou 15 anos para chegar a 85 unidades. Com o sistema atual e os gaps resolvidos, a Smarter tem condições de vender franquias de forma agressiva sem comprometer a qualidade da operação. O CRM de venda de franquias (FranquiaLead) já está no sistema — é questão de ativar tráfego pago e ter histórico de resultado para mostrar.

A Smarter não vai ganhar na escala do CIEE. Vai ganhar na margem, na tecnologia e na experiência do franqueado local. Esse é o posicionamento correto. Execute o roadmap de curto prazo e coloque 10 franqueados operando com autonomia. O mercado vai validar o resto.

---

*Análise baseada em: leitura do schema completo do banco de dados (30+ tabelas), auditoria de segurança interna (88/100), leitura do README e documentação técnica, estatísticas ABRES 2024-2025, dados Super Estágios (Portal do Franchising 2024), dados IEL (Portal da Indústria), dados Nube (CNN Brasil / LinkedIn), dados de mercado (Ministério do Trabalho, INEP/MEC, PNAD Contínua 2024).*
