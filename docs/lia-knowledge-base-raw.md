# Base de Conhecimento Operacional — Sistema Smarter (para a Lia)

> Investigação 100% somente-leitura do código-fonte, feita em 2026-07-17 sobre o estado atual de `smarter-v2-completo`. Todo texto entre aspas é cópia literal do que aparece na UI (JSX) — não é paráfrase. Onde o código não deixa algo claro, isso está marcado explicitamente como **"não confirmado"** / **"não está claro no código"**. Nada foi suposto para preencher lacuna.
>
> Objetivo: servir de base operacional para a assistente "Lia" (suporte dentro do sistema), que hoje inventa passo a passo quando não sabe a resposta. Este documento cobre: Instituições de Ensino (IES) e convênio, CRM, Processos Seletivos e Vagas, Cadastros (estudante/empresa/franquia), Marketing Hub e Tráfego Pago, Documentos gerados automaticamente, Financeiro/cobrança, Configurações da unidade, e as demais abas do menu (Equipe, Gamificação, Engajamento, Saúde do Sistema, Seguros, Notificações/Alertas, Bloqueio por inadimplência).
>
> Cada seção cita o arquivo/rota de código correspondente para permitir reverificação caso algo mude.

---

## 1. INSTITUIÇÕES DE ENSINO (IES) E CONVÊNIO — a área que estava incompleta

### Achado crítico que muda a resposta da Lia sobre esse fluxo

Existem **duas áreas separadas e não integradas** no código que lidam com "instituição":

1. **`/dashboard/instituicoes`** — está no Sidebar (label exato **"Instituições"**, ícone `BookOpen`). É o **cadastro geral** de instituição de ensino (dados cadastrais, vínculo de estudantes/contratos). Arquivos: `app/dashboard/instituicoes/page.tsx`, `InstituicoesTable.tsx`, `nova/page.tsx`, `[id]/page.tsx`, `[id]/InstituicaoEdit.tsx`, `[id]/CopyLinkButton.tsx`.
2. **`/dashboard/ies`** — rota que **NÃO aparece em nenhum lugar do `components/layout/Sidebar.tsx`** (confirmado lendo o arquivo inteiro: a string `/dashboard/ies` não existe nele, nem no menu desktop, nem no mobile, nem no `PERM_NAV_MAP` de FUNCIONARIO/EQUIPE). É a área do **convênio/portal de adesão** (geração de link, envio, assinatura, acompanhamento de status).

**Conclusão explícita**: `/dashboard/ies` não é área legada morta — é ativamente usada e funcional (chamadas de API reais, envio de e-mail, geração de token), mas está **"escondida"**: só se chega nela por um link direto na ficha de `/dashboard/instituicoes/[id]` (texto do link: "**→ Gerar convite pelo Portal IES**") ou navegando internamente dentro de `/dashboard/ies/*`. Não há botão de menu. **Isso é importante para a Lia**: se perguntarem "como envio o convênio pra uma IES", o caminho real passa por essa área oculta, não pelo item "Instituições" do menu sozinho.

**Achado adicional importante (leitura literal do código, não suposição)**: o formulário de `/dashboard/ies/novo` tem um autocomplete "🔍 Buscar IES já cadastrada" que permite selecionar uma instituição já existente (da tabela `/dashboard/instituicoes`) para pré-preencher o formulário. Porém, ao clicar em "Criar convite e enviar →", o `handleSubmit` envia apenas os campos do formulário (sem `id`) para `POST /api/ies`, e essa rota **sempre executa `prisma.institution.create`** (não faz `update`/`upsert` em uma instituição existente). Ou seja: **usar esse fluxo para uma IES que já existe em `/dashboard/instituicoes` cria um registro duplicado** (nova linha em `Institution`, novo `id`, novo `token`), em vez de adicionar o token/convite à instituição já cadastrada. A instituição original (com estudantes/contratos vinculados) permanece sem token para sempre, a menos que o operador clique no link "Gerar convite pelo Portal IES" a partir dela — mas mesmo esse link não passa o `id` da instituição de origem (`Link href="/dashboard/ies/novo"`, sem `?iesId=`), então mesmo assim gera um registro novo e desvinculado. Não está claro no código se esse comportamento é intencional ou um bug não corrigido; recomenda-se tratar como área de atenção ao orientar o franqueado.

### 1.1 Como o franqueado CADASTRA uma nova IES (cadastro geral, sem convênio)

**Relevante para**: FRANQUEADORA, FRANQUEADO, FUNCIONARIO (com permissão `instituicoes`), EQUIPE (com permissão `instituicoes`).

Passo a passo:
1. No menu lateral, clique em **"Instituições"** (ícone de livro). Isso leva à rota `/dashboard/instituicoes` (`app/dashboard/instituicoes/page.tsx`).
2. A página mostra o título "Instituições de Ensino" e o contador "N instituições cadastradas". Clique no botão **"+ Nova Instituição"** (canto superior direito).
3. Isso navega para `/dashboard/instituicoes/nova` (`app/dashboard/instituicoes/nova/page.tsx`).
4. Preencha o formulário. Campos exatos (labels literais do JSX):
   - **"Nome \*"** (obrigatório)
   - **"Razão Social"**
   - **"CNPJ"**
   - **"Tipo"** (select com opções: `Publica Federal`, `Publica Estadual`, `Privada`, `Tecnica`, `EJA`, `Outro` — valor padrão `"Privada"`)
   - **"E-mail"**
   - **"Telefone"**
   - **"Coordenador(a)"**
   - **"Cargo"**
   - **"Endereço"**
   - **"Cidade"**
   - **"UF"**
   - **"CEP"**
5. Clique em **"Cadastrar Instituição"** (o botão mostra "Salvando..." enquanto processa).
6. Ao salvar, o sistema chama `POST /api/app/instituicoes` (`app/api/app/instituicoes/route.ts`), que cria o registro via `prisma.institution.create`. Se a instituição tiver e-mail cadastrado, um e-mail de boas-vindas é disparado (`enviarBoasVindasInstituicao`, não bloqueante — falha no envio não impede o cadastro).
7. Após sucesso, o usuário é redirecionado de volta para `/dashboard/instituicoes`.

**Importante**: este cadastro **não gera token de portal nem convênio**. Ele apenas cria a instituição na base geral (usada para vincular estudantes/contratos). Para gerar o link de adesão/convênio, é necessário o fluxo da seção 1.2, que é uma área separada.

Permissão da API (`checkPermission(session, "instituicoes")` em `lib/permissions.ts`): FRANQUEADORA e FRANQUEADO têm acesso total; FUNCIONARIO e EQUIPE só acessam se tiverem a chave `"instituicoes"` no array `permissoes` da sessão; EMPRESA e ESTUDANTE não têm acesso (403).

### 1.2 Como o franqueado ENVIA o link/minuta de convênio para a IES

**Relevante para**: FRANQUEADORA, FRANQUEADO, FUNCIONARIO (sem checagem de permissão granular — ver observação). EQUIPE **não tem acesso** a este fluxo.

Existem dois pontos de entrada:

**Caminho A — a partir da ficha da instituição em `/dashboard/instituicoes/[id]`**
1. Acesse `/dashboard/instituicoes/[id]` (clicando em "Ver →" na tabela de instituições).
2. Role até o card **"Portal de Adesão IES"** (subtítulo: "Link exclusivo para esta IES assinar o convênio eletronicamente").
3. Se a instituição **ainda não tem token**, aparece a mensagem "Esta instituição ainda não tem um portal de adesão gerado." com o link **"→ Gerar convite pelo Portal IES"**, que leva para `/dashboard/ies/novo` (sem pré-preenchimento — ver achado crítico acima sobre duplicação).
4. Se a instituição **já tem token**, o card mostra o link do portal (`https://.../ies/{token}`) e o botão da `CopyLinkButton.tsx`.

**Caminho B — fluxo dedicado em `/dashboard/ies` (o fluxo "correto"/completo de convite)**
1. Acesse a URL `/dashboard/ies` diretamente (não há botão de menu). Título da página: **"Portal de Adesão IES"**.
2. Clique em **"+ Novo convite"** (topo direito) → vai para `/dashboard/ies/novo`.
3. Na página "Novo Convite IES", opcionalmente use o campo **"🔍 Buscar IES já cadastrada"** para localizar uma IES existente (busca por nome/CNPJ, mínimo 2 caracteres) e selecioná-la para pré-preencher os dados.
4. Preencha os campos (labels literais):
   - Seção "Dados da Instituição": **"Nome da Instituição \*"**, **"Razão Social"**, **"CNPJ"**, **"Tipo"** (select: Ensino Superior=`SUPERIOR`, Ensino Técnico=`TECNICO`, Ensino Médio=`MEDIO`, Pós-Graduação=`POS_GRADUACAO`), **"Site"**.
   - Seção "Responsável / Coordenador": **"Nome do Coordenador"**, **"Cargo"**, **"E-mail do Convite \*"** (obrigatório — "O link do portal será enviado para este e-mail."), **"Telefone"**.
   - Seção "Endereço": **"Endereço"**, **"Cidade"**, **"UF"**.
5. Clique em **"Criar convite e enviar →"**.
6. Isso chama `POST /api/ies` (`app/api/ies/route.ts`), que:
   - Gera um **token único** (`crypto.randomBytes(12).toString("hex")`, 24 caracteres hex).
   - Cria um novo registro `Institution` com `convenioStatus: "PENDENTE"` e `conviteEnviadoEm: new Date()`.
   - Monta a URL do portal: `${appUrl}/ies/${token}`.
   - Tenta enviar automaticamente um e-mail de convite via `enviarConviteIES` (assunto/corpo: "Convite de Convênio de Estágio").
7. Tela de sucesso ("🎉 Convite criado!"): mostra se o e-mail foi enviado ou não; se não, exibe aviso "⚠️ E-mail não enviado automaticamente. Envie o link manualmente." com o motivo. Mostra o link completo com botão **"📋 Copiar link"**.
8. Botões finais: **"Ver lista"** (volta para `/dashboard/ies`) ou **"+ Nova IES"** (limpa o formulário para criar outra).

**Passo a passo resumido, pronto para responder "como envio convênio pra uma IES"**: Cadastrar a IES em Instituições → abrir a ficha → clicar em "Gerar convite pelo Portal IES" (ou ir direto em `/dashboard/ies` → "+ Novo convite") → preencher e-mail do responsável → "Criar convite e enviar" → copiar o link gerado (se o e-mail automático falhar) → acompanhar status em `/dashboard/ies` → entrar em contato com a instituição para confirmar recebimento se necessário.

### Texto exato do botão de copiar link (confirmado no JSX)
- Em `CopyLinkButton.tsx` (usado dentro de `/dashboard/instituicoes/[id]`): botão mostra **"📋 Copiar link"**, e após clicar muda para **"✅ Copiado!"** por 2,5 segundos (cor muda de azul escuro `#0f2a5e` para verde `bg-emerald-100 text-emerald-700`). Usa `navigator.clipboard.writeText`.
- Em `/dashboard/ies/page.tsx` (lista e aba de acompanhamento): botão mostra **"🔗 Copiar link"**, e após clicar muda para **"✓ Copiado"** (lista) ou **"✓ Link copiado!"** (aba de acompanhamento) por 2,5s.
- Em `/dashboard/ies/[id]/page.tsx`: botão mostra **"📋 Copiar link"**, muda para **"✓ Link copiado!"** após clicar.

**Observação de permissão (não confirmado se é intencional)**: `POST /api/ies` checa apenas `["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)`, **sem** chamar `checkPermission()`/checar a lista granular de `permissoes` do FUNCIONARIO — diferente de `/api/app/instituicoes`, que exige explicitamente a permissão `"instituicoes"`. Ou seja, qualquer usuário com role `FUNCIONARIO` pode criar convites de IES por esta rota, mesmo sem a permissão granular "instituicoes" habilitada.

### 1.3 O que a IES vê e faz do lado dela (portal público via token)

**Relevante para**: IES (acesso público, sem login de sistema — não existe role `IES` no `UserRole` do Prisma; o "acesso" da IES é inteiramente baseado em possuir o token da URL).

Rota: `app/ies/[token]/page.tsx`. É uma página client-side com máquina de estados (`etapa`), sem autenticação NextAuth — carrega os dados via `GET /api/ies/[token]` (rota pública).

Etapas (`Etapa` = `"landing" | "documentos" | "minuta" | "assinatura" | "concluido" | "login" | "portal"`):

1. **`landing`**: página institucional de apresentação da Smarter ("🎓 Convite exclusivo para {nome da IES}"). Dois botões principais:
   - **"Firmar convênio →"** → vai para etapa `documentos`.
   - **"Já tenho convênio · Acessar portal"** → vai para etapa `login`.
   - Também há o link menor **"Minha instituição ainda não está cadastrada?"** → também vai para `login`.
2. **`documentos`**: mostra os "Documentos da Smarter Estágios" (certidões, CNPJ etc., vindos de `SmarterDocumento` via `documentos` retornados por `GET /api/ies/[token]`). Cada documento tem botão **"📥 Baixar"**. Botões de navegação: **"← Voltar"** e **"Ler minuta de convênio →"**.
3. **`minuta`** (Convênio de Estágio): a IES escolhe entre dois radio buttons:
   - **"Minuta Smarter"** — usa a minuta padrão, renderizada via `components/ies/MinutaConvenio.tsx` dentro de uma área com scroll. A leitura só é considerada concluída (`minutaLida = true`) quando o usuário rola até o fim do container (detecção via evento `onScroll`). Enquanto não rolar até o fim: aviso "Role até o final do documento para habilitar a assinatura." Depois: "Leitura concluída! Você já pode prosseguir para a assinatura."
   - **"Minuta da Instituição"** — a IES faz upload de um PDF próprio (input `type="file" accept=".pdf"`, obrigatório, máx. 20MB — validado no backend).
   - Botão final: **"Prosseguir para assinatura →"** (minuta Smarter, desabilitado até `minutaLida=true`) ou **"Prosseguir →"** (minuta própria).
4. **`assinatura`**:
   - Campos: **"Nome Completo do Representante \*"**, **"CPF \*"** (com máscara automática), **"E-mail Institucional \*"**.
   - Se minuta Smarter: dois checkboxes obrigatórios — "Declaro que li e compreendi integralmente o Convênio de Estágio..." e "Declaro que sou representante legal ou possuo poderes delegados...". Botão final: **"✅ Assinar convênio"**.
   - Se minuta própria: campo opcional **"Observações"**. Botão final: **"📨 Enviar para assinatura via Autentique"**.
5. **`concluido`**: tela final, diferente conforme o tipo de minuta:
   - Minuta Smarter → "Convênio Firmado! 🎉", mostra **protocolo** (string gerada em base64 a partir de `institutionId|timestamp`), e diz que um e-mail com credenciais de acesso foi enviado.
   - Minuta própria → "Documento enviado ao Autentique! 📨" (se envio ao Autentique deu certo, mostra o link de assinatura) ou "Solicitação recebida! 📋" (se falhou o envio ao Autentique — fluxo cai para tratamento manual pela equipe).
6. **`login`**: campos **"E-mail do convênio"** e **"Senha (recebida por e-mail)"** (placeholder mostra o formato `SMTR-XXX-XXX`). Botão **"Entrar no portal →"**.
7. **`portal`** (autenticado): saudação "Bem-vindo(a), {nome}!", dois cartões de navegação — **"Documentos da Smarter"** e **"Minuta do Convênio"** — e um card de contato "📞 Precisa de ajuda?". **É somente nesta etapa que o widget da Lia (`LiaWidget contexto="IES"`) aparece na tela.**

**Assinatura da minuta Smarter** — `app/api/ies/[token]/assinar/route.ts` (rota pública, `POST`):
- Valida nome/CPF/e-mail obrigatórios, e (se não for minuta própria) os dois checkboxes de confirmação.
- Bloqueia se `convenioStatus` já é `"FIRMADO"` (erro 409, "Este convênio já foi assinado anteriormente.") ou `"CANCELADO"` (erro 410).
- Captura IP e User-Agent para log de auditoria (`assinaturaLog`, campo `Json`).
- Gera senha de acesso ao portal no formato `SMTR-XXX-XXX` (função `gerarSenhaPortal`), faz hash bcrypt e salva em `portalSenha`.
- Atualiza `convenioStatus` para `"FIRMADO"`, grava `convenioAssinadoEm`, dados do assinante.
- Envia e-mail `enviarConvenioFirmadoIES` com o protocolo e a senha em texto puro (a senha só existe em texto puro nesse momento, depois só o hash fica salvo).

**"Minuta própria" — o que é e como funciona** (`app/api/ies/[token]/minuta-propria/route.ts`, `POST`, multipart/form-data). Sim — confirmado: a IES pode enviar a própria minuta em vez de usar a da Smarter. Fluxo:
- A IES envia um PDF (campo `arquivo`) + nome/CPF/e-mail do representante + observação opcional.
- O sistema valida e, se possível, **envia o PDF diretamente para a Autentique** via GraphQL (`createDocument` mutation), com dois signatários: o representante da IES e `convenios@smarterestagios.com.br` (representando a Smarter). Se o token da Autentique (`AUTHENTIQUE_API_TOKEN` ou config do sistema) não estiver configurado, ou a chamada falhar, o erro é capturado (`autentiqueErro`) e **não bloqueia o fluxo** — a solicitação é registrada mesmo assim, e a equipe de convênios trata manualmente.
- Em qualquer caso (sucesso ou falha no Autentique), o `convenioStatus` da instituição é atualizado para **`"AGUARDANDO_MINUTA"`** (não `"FIRMADO"`).
- Dispara e-mail interno `enviarMiniutaPropriaParaSmarter` avisando a equipe.
- Bloqueia reenvio se já existir uma solicitação em andamento (`convenioStatus === "AGUARDANDO_MINUTA"` → erro 409 "Já existe uma solicitação em andamento para esta IES.").

**Login da IES** (`app/api/ies/[token]/login/route.ts`, `POST`, rota pública):
- Exige `convenioStatus === "FIRMADO"` (senão erro 403: "O convênio desta instituição ainda não foi firmado.").
- Confere e-mail (case-insensitive) contra `assinanteEmail` e senha via `bcrypt.compare` contra `portalSenha`.
- Não gera sessão NextAuth nem cookie — o `token` da URL continua sendo o único mecanismo de acesso; o "login" apenas move a etapa da página client-side para `"portal"`.

### 1.4 Como se acompanha o status do convênio

**Relevante para**: FRANQUEADORA (vê rede toda) e FRANQUEADO/FUNCIONARIO (vê apenas as IES da própria unidade, filtradas por `franchiseId`).

**Valores exatos do enum de status** (campo `convenioStatus`, `String?` no Prisma, comentário no schema: `// PENDENTE | FIRMADO | CANCELADO | AGUARDANDO_MINUTA`):
- `PENDENTE` — valor padrão ao criar o convite (`@default("PENDENTE")`).
- `FIRMADO` — após assinatura da minuta Smarter.
- `AGUARDANDO_MINUTA` — após envio de minuta própria (aguardando tratamento da equipe/Autentique).
- `CANCELADO` — usado nas checagens de bloqueio, mas **não encontrei nenhuma rota/API que efetivamente defina este status** (não há endpoint de "cancelar convênio" localizado na busca). Isso é "não confirmado" — o valor existe no enum/labels da UI, mas o mecanismo de transição para `CANCELADO` não foi localizado no código investigado.

**Onde aparece na UI**:

Em `/dashboard/instituicoes/[id]/page.tsx` (card "Portal de Adesão IES"), badge de status com cores e labels exatos:
- `FIRMADO` → `bg-emerald-100 text-emerald-700` — texto **"✅ Convênio Firmado"**
- `AGUARDANDO_MINUTA` → `bg-amber-100 text-amber-700` — texto **"📋 Minuta Própria — Aguardando"**
- `CANCELADO` → `bg-red-100 text-red-700` — texto **"❌ Cancelado"**
- qualquer outro (ex. `PENDENTE`) → `bg-yellow-100 text-yellow-700` — texto **"⏳ Aguardando assinatura"**

Em `/dashboard/ies/page.tsx` e `/dashboard/ies/[id]/page.tsx` (mapas `statusCor`/`statusLabel`), labels ligeiramente diferentes:
- `FIRMADO` → **"✅ Firmado"** (lista) / **"✅ Convênio Firmado"** (detalhe) — verde
- `PENDENTE` → **"⏳ Aguardando"** (lista) / **"⏳ Aguardando resposta"** (detalhe) — âmbar
- `CANCELADO` → **"❌ Cancelado"** — vermelho
- `AGUARDANDO_MINUTA` → **"📋 Minuta Própria"** (lista) / **"📋 Minuta própria em análise"** (detalhe) — roxo (`bg-purple-100 text-purple-700`)

**Página de acompanhamento dedicada**: em `/dashboard/ies`, existem duas abas (texto exato dos botões):
- **"📋 Lista de convites"** — tabela simples com colunas Instituição / Unidade (ou Cidade/UF) / Status / Convite enviado / Ações.
- **"📊 Acompanhamento"** — cards detalhados por IES, com: contato para cobrança, localização, datas (convite enviado, dias sem resposta, data de assinatura), e ações (copiar link ou "✉️ Enviar cobrança por e-mail" — que abre um `mailto:` pré-preenchido). Se `convenioStatus === "PENDENTE"` e passaram mais de 7 dias desde `conviteEnviadoEm`, o card fica destacado em âmbar com o aviso **"⚠️ Esta IES está há {N} dias sem responder o convite. Considere enviar uma cobrança pelo e-mail ou telefone acima."**

KPIs no topo de `/dashboard/ies` (labels exatos): "Total de convites", "Convênios firmados", "Aguardando resposta", "Minuta própria".

A partir da ficha de detalhe (`/dashboard/instituicoes/[id]`), há também o link **"→ Gerar convite pelo Portal IES"**, e a partir de `/dashboard/ies/[id]` há o botão **"📊 Acompanhar rede"** (se FRANQUEADORA) ou **"📊 Acompanhar convênios"** (demais papéis) que leva para `/dashboard/ies?aba=acompanhamento`.

### 1.5 Reenvio de convênio

**Relevante para**: qualquer usuário autenticado (ver observação de permissão abaixo) — a rota não restringe por role específico além de exigir sessão.

**Onde o botão aparece**: exclusivamente em `/dashboard/ies/[id]/page.tsx`, dentro do card "🔗 Link do Portal de Adesão":
- Botão **"✉️ Enviar por e-mail"** (texto durante o envio: "Enviando...") — desabilitado se `enviando` estiver true ou se a IES não tiver e-mail cadastrado (nesse caso aparece o aviso "⚠️ Nenhum e-mail cadastrado — copie o link e envie manualmente.").
- Há também, no cabeçalho da mesma página, o botão **"✉️ Reenviar convite"**, que na verdade **não reenvia e-mail** — ele navega para `/dashboard/ies/novo?iesId={id}` (cria um novo formulário pré-preenchido com os dados desta IES, sujeito ao mesmo risco de duplicação de registro descrito no achado crítico).

**Rota chamada pelo botão "✉️ Enviar por e-mail"**: `POST /api/admin/ies-portal/[id]/reenviar-convite` (`app/api/admin/ies-portal/[id]/reenviar-convite/route.ts`). Comportamento:
- Exige apenas sessão válida (`if (!session)`), **sem checagem de role/permissão específica** — qualquer usuário logado (inclusive EMPRESA/ESTUDANTE, se a rota fosse chamada diretamente) teoricamente passaria nesse guard. Observação de segurança, leitura literal do código.
- Retorna erro se a IES não tiver e-mail (`"IES sem e-mail cadastrado."`) ou não tiver token (`"IES sem token de portal."`).
- Atualiza `conviteEnviadoEm` e `conviteEnviadoPor`.
- Reenvia o mesmo e-mail de convite (`enviarConviteIES`).
- Feedback na tela: "Convite enviado com sucesso!" (sucesso) ou a mensagem de erro retornada pela API (falha).

**Confirmação do stub desativado**: `app/api/ies/_STUB_id_disabled/reenviar-convite/route.ts` contém apenas:
```
// Este arquivo foi movido para /app/api/admin/ies-portal/[id]/reenviar-convite/route.ts
// Mantido vazio para não conflitar com a build
export {};
```
Confirmado: é um stub morto/desativado, mantido só para não quebrar o build do Next.js. A rota real e ativa é `/api/admin/ies-portal/[id]/reenviar-convite`.

### 1.6 Documentos relacionados a IES

**Relevante para**: FRANQUEADORA (gerencia os documentos), IES (visualiza/baixa via token, sem login necessário).

Existe um catálogo de **documentos institucionais da Smarter** (não documentos da própria IES) que ficam disponíveis para a IES baixar — modelo `SmarterDocumento` no Prisma (`nome`, `tipo` [`CERTIDAO | CNPJ | ALVARA | CONTRATO | OUTRO`], `url`, `descricao`, `vigencia`, `ativo`, `ordem`).

- **`GET /api/ies/documentos`** — lista documentos ativos, sem exigir autenticação no `GET`.
- **`POST`/`DELETE /api/ies/documentos`** — restrito a `session.user.role === "FRANQUEADORA"`.
- **`GET /api/ies/[token]/documentos`** — versão pública por token, usada pelo portal da IES; valida apenas que o token existe.
- **`GET/POST /api/admin/ies-documentos`** e **`PATCH/DELETE /api/admin/ies-documentos/[id]`** — CRUD administrativo completo, também restrito a `role === "FRANQUEADORA"`. **A tela de cadastro real desses documentos é a aba "Certidões IES" em Configurações** — ver seção 8.1.

No portal da IES, os documentos aparecem na etapa `documentos` (`app/ies/[token]/page.tsx`), cada um com ícone conforme o tipo (📋 Certidão, 🏢 CNPJ, 📜 Alvará, 📄 Contrato, 📎 Outro), indicação de vencimento se aplicável ("⚠️ vencido" em vermelho se a data de vigência já passou), e botão **"📥 Baixar"**.

**Não há fluxo de upload de documentos pela própria IES** encontrado no código (fora do PDF de minuta própria, tratado na seção 1.3).

### 1.7 Edição de dados da IES

**Relevante para**: FRANQUEADORA e FRANQUEADO (a API bloqueia explicitamente FUNCIONARIO, EQUIPE, EMPRESA, ESTUDANTE).

- Componente: `InstituicaoEdit.tsx`, renderizado dentro de `/dashboard/instituicoes/[id]/page.tsx`, no card **"Editar Instituição"**.
- Campos editáveis (mesmos labels do cadastro, mais dois adicionais): "Nome \*", "Razão Social", "CNPJ", "Tipo", "E-mail", "Telefone", "Coordenador(a)", "Cargo", "Endereço", "Cidade", "UF", "CEP", **"Site"**, e **"Cursos (separados por vírgula)"**.
- Botão: **"Salvar Alterações"** (mostra "Salvando..." durante o processo). Mensagem de sucesso: **"Salvo com sucesso! ✓"** (verde); mensagem de erro: **"Erro ao salvar."** (vermelho).
- Chama `PATCH /api/app/instituicoes/[id]`.
- Restrição de role explícita no código: `if (!["FRANQUEADORA", "FRANQUEADO"].includes(role)) return 403 "Sem permissão para editar instituições."` — comentário no código: *"Instituições são compartilhadas na rede — apenas admins podem editar."* Ou seja, **FUNCIONARIO e EQUIPE não podem editar instituições mesmo com a permissão granular `"instituicoes"` habilitada**.
- **Importante**: esta tela de edição só edita os dados cadastrais gerais da instituição (`/dashboard/instituicoes`). Não edita nada da área `/dashboard/ies` (convênio/token) — são registros e telas totalmente separados.

### 1.8 Exclusão de IES

**Relevante para**: exclusivamente FRANQUEADORA (tanto no componente quanto na API).

- Componente: `InstituicaoDeleteButton.tsx`, na tabela de `/dashboard/instituicoes`, condicionado a `isFranqueadora` — o botão nem aparece na tela para outros papéis.
- Botão na tabela: ícone **"🗑️"** (sem texto), com `title` dinâmico ("Possui N estudante(s) e N contrato(s) — não pode excluir" ou "Excluir instituição").
- Modal de confirmação: se **tem vínculos**, modal âmbar **"⚠️ Não é possível excluir"** com botão único **"Entendido"**. Se **não tem vínculos**, modal vermelho **"⚠️ Ação irreversível"** com botões **"Cancelar"** e **"Sim, Excluir"**.
- Chama `DELETE /api/app/instituicoes/[id]`, que valida novamente `role === "FRANQUEADORA"` e recalcula vínculos no backend (proteção redundante).

### 1.9 Schema Prisma — campos e enums relevantes (IES)

**`model Institution`** (tabela `institutions`, `prisma/schema.prisma` a partir da linha 124):
- Campos cadastrais gerais: `id`, `name`, `razaoSocial`, `cnpj`, `tipo` (`String?` — não é enum; valores usados na prática: `"Publica Federal" | "Publica Estadual" | "Privada" | "Tecnica" | "EJA" | "Outro"` no fluxo de `/dashboard/instituicoes`, mas `"SUPERIOR" | "TECNICO" | "MEDIO" | "POS_GRADUACAO"` no fluxo de `/dashboard/ies` — **dois vocabulários diferentes convivendo no mesmo campo `tipo`**), `email`, `telefone`, `coordenador`, `cargoCoord`, `cidade`, `uf`, `endereco`, `cep`, `cursos` (`String[]`), `site`, `createdAt`, `updatedAt`.
- Bloco "Portal de Adesão IES" (comentado explicitamente no schema): `token String? @unique`, `franchiseId String?`, `convenioStatus String? @default("PENDENTE")` (comentário: `// PENDENTE | FIRMADO | CANCELADO | AGUARDANDO_MINUTA`), `convenioAssinadoEm DateTime?`, `assinanteName`, `assinanteEmail`, `assinanteCpf`, `assinanteIp`, `assinanteUserAgent`, `assinaturaLog Json?`, `minutaAssinadaUrl String?` (não confirmado se está em uso — não localizei rota que o preencha), `conviteEnviadoEm DateTime?`, `conviteEnviadoPor String?`, `portalSenha String?` (hash bcrypt).
- Relações: `contracts Contract[]`, `students Student[]`. Índices: `@@index([franchiseId])`, `@@index([convenioStatus])`, `@@index([token])`.

**`model SmarterDocumento`** (tabela `smarter_documentos`): `id`, `nome`, `tipo String @default("CERTIDAO")` (comentário: `// CERTIDAO | CNPJ | ALVARA | CONTRATO | OUTRO`), `url`, `descricao`, `vigencia`, `tamanho`, `ativo Boolean @default(true)`, `ordem`.

**`enum UserRole`** (linha 716): `FRANQUEADORA, FRANQUEADO, EMPRESA, ESTUDANTE, FUNCIONARIO, EQUIPE`. Não existe role `IES` — a IES nunca é um `User` autenticado via NextAuth; seu "acesso" é inteiramente via posse do `token` da URL pública, mais o par e-mail/senha gerado após assinatura (checagem manual, não NextAuth).

### 1.10 Tabela de roles e acesso por parte do fluxo IES

| Ação | Rota | Quem pode (confirmado no código) |
|---|---|---|
| Cadastrar instituição (geral) | `POST /api/app/instituicoes` | FRANQUEADORA, FRANQUEADO sempre; FUNCIONARIO/EQUIPE se tiverem permissão `"instituicoes"`; EMPRESA/ESTUDANTE nunca |
| Editar instituição (geral) | `PATCH /api/app/instituicoes/[id]` | Apenas FRANQUEADORA e FRANQUEADO (ignora permissão granular de FUNCIONARIO/EQUIPE) |
| Excluir instituição | `DELETE /api/app/instituicoes/[id]` | Apenas FRANQUEADORA |
| Listar/buscar instituições (geral) | `GET /api/app/instituicoes`, `.../buscar` | FRANQUEADORA/FRANQUEADO sempre; FUNCIONARIO/EQUIPE com permissão `"instituicoes"` (busca usa permissão `"contratos"`, atenção a essa diferença) |
| Criar convite IES (token) | `POST /api/ies` | FRANQUEADORA, FRANQUEADO, FUNCIONARIO (sem checagem de permissão granular). **EQUIPE bloqueado (403).** |
| Listar convites IES | `GET /api/ies` | FRANQUEADORA vê todas; FRANQUEADO/FUNCIONARIO só as da própria `franchiseId`; qualquer outro role recebe 403 |
| Reenviar convite por e-mail | `POST /api/admin/ies-portal/[id]/reenviar-convite` | Qualquer sessão autenticada (sem checagem de role) — ponto de atenção |
| Gerenciar documentos Smarter (CRUD) | `POST/DELETE /api/ies/documentos`, `/api/admin/ies-documentos*` | Apenas FRANQUEADORA |
| Ver documentos Smarter | `GET /api/ies/documentos`, `GET /api/ies/[token]/documentos` | Público |
| Ver dados da IES pelo token | `GET /api/ies/[token]` | Público (por design) |
| Assinar convênio (minuta Smarter) | `POST /api/ies/[token]/assinar` | Público (IES não tem login) |
| Enviar minuta própria | `POST /api/ies/[token]/minuta-propria` | Público |
| Login da IES no portal | `POST /api/ies/[token]/login` | Público, só funciona se `convenioStatus === "FIRMADO"` |
| Chat com a Lia no portal IES | `GET/POST /api/ies/[token]/lia` | Público por token, só responde se `convenioStatus === "FIRMADO"` |

Confirmação final: em nenhuma rota de IES investigada os roles `EMPRESA` ou `ESTUDANTE` aparecem nas listas de permissão — sempre bloqueados. Esperado: o fluxo de convênio é operação interna do franqueado/franqueadora.

---

## 2. CRM (vendas/leads de empresas) E CRM FRANQUIAS

### 2.1 Estrutura do pipeline do CRM principal (empresas)

**CONFIRMADO: são 6 etapas**, definidas em `lib/crm/sla-config.ts` (objeto `SLA_CONFIG`), consumido por `app/dashboard/crm/page.tsx` e `app/dashboard/crm/[id]/page.tsx`.

| Ordem | Chave (etapa no banco) | Label exibido (texto exato) | SLA (dias) |
|---|---|---|---|
| 1 | `novo_lead` | "Novo Lead" | 1 |
| 2 | `primeiro_contato` | "Contatado" | 3 |
| 3 | `apresentacao` | "Reunião Agendada" | 7 |
| 4 | `proposta` | "Proposta Enviada" | 5 |
| 5 | `negociacao` | "Em Negociação" | 10 |
| 6 | `fechado` | "Fechado ✓" | 0 (terminal) |

Campo `etapa` do model `CrmLead` é `String? @default("novo_lead")` — sem enum formal, string livre validada só na aplicação.

### 2.2 Como criar um lead/empresa manualmente no CRM principal

Rota: `/dashboard/crm` (`app/dashboard/crm/page.tsx`).

1. Acesse **CRM** no menu (`/dashboard/crm`).
2. No canto superior direito, clique em **"+ Novo Lead"**.
3. Abre modal "Novo Lead" com os campos:
   - **CNPJ** (opcional — máscara `00.000.000/0000-00`; ao sair do campo, busca dados na BrasilAPI e preenche automaticamente Empresa, Cidade, UF e Segmento).
   - **Empresa \*** (obrigatório), Contato, Cargo, E-mail, WhatsApp, Telefone (fixo), Instagram, LinkedIn, Cidade, UF (select), Segmento.
   - **Origem** (select: "Site / Link Público", "Instagram", "Tráfego Pago", "Equipe Comercial", "WhatsApp", "Inserção Manual", "Indicação", "LinkedIn", "E-mail", "Evento").
   - **Prioridade** (botões: "Baixa" / "Media" / "Alta" — padrão "media").
   - **Observação inicial** (textarea).
4. Clique em **"Criar Lead"** (desabilitado até preencher Empresa).
5. O lead é criado com `etapa: "novo_lead"` e `situacao: "ativo"` automaticamente.

Rota de API: `POST /api/app/crm`. Validação via `criarLeadSchema` em `lib/api-schemas.ts`.

Relevante para: FRANQUEADORA (lead sem `franchiseId`) e FRANQUEADO (lead com o `franchiseId` da sessão).

Segundo caminho: no card "Nenhum lead ativo" (kanban vazio), link **"+ Criar primeiro lead"** abre o mesmo modal.

### 2.3 Como mover um lead de uma etapa para outra

Não é drag-and-drop. É feito por dropdown/select ou botões de lista, em dois lugares:

**A) No Kanban do CRM (`/dashboard/crm`)** — dentro de cada card de lead ativo (exceto na coluna "Fechado ✓"), há um `<select>` no rodapé do card com as 6 etapas. Selecionar dispara `moverEtapa(id, etapa)` → `PATCH /api/app/crm/{id}` com `{ etapa }`.

**B) Na página de detalhe do lead (`/dashboard/crm/[id]`)** — Card lateral "Etapa do Pipeline": lista vertical de botões `→ {ETAPA_LABEL}`. Clicar em etapa diferente da atual chama `patch({ etapa: e })`. Etapa ativa destacada em azul escuro.

Consequências automáticas ao mudar de etapa (`PATCH /api/app/crm/[id]`):
- Cria automaticamente uma `CrmNota` do tipo `etapa`: `📍 Etapa atualizada para "{label}".`
- Se o lead tiver e-mail e `optIn=true`, dispara e-mail comercial automático baseado em template da etapa (`lib/crm/email-templates.ts`) e registra outra nota `✉️ E-mail comercial enviado: "..."`.

**"Vendido"/"Perdido"** não são etapas comuns — são ações especiais separadas: botões **"🏆 Vendido"** e **"✗ Perdido"** no header da página de detalhe, ou o botão **"✕ perdido"** no rodapé do card no Kanban.

### 2.4 Notas e tarefas do lead (CRM principal)

Página: `/dashboard/crm/[id]`.

Nomes exatos das seções: coluna "Tarefas ({N} pendentes)" e coluna "Timeline ({N})" (não existe aba separada "Notas" — notas e tarefas aparecem juntas cronologicamente na Timeline).

**Adicionar uma nota**: botão **"📝 Nota"** (header) ou **"+ Nota"** (card Timeline) → modal **"Registrar Interação"** → escolher Tipo (📝 Anotacao, 📞 Ligacao, ✉️ Email, 🤝 Reuniao, 📱 Whatsapp, 📍 Etapa, 🚨 Alerta) → preencher **"Anotação \*"** → **"Registrar ✓"**. API: `PATCH /api/app/crm/[id]` com `{ action: "add_nota", texto, tipo }`.

**Criar/marcar tarefa**: botão **"✅ Tarefa"** (header) ou **"+ Nova"** (card Tarefas) → modal **"Nova Tarefa"** → "Descrição \*", "Data", "Horário", "Link de Reunião (opcional)", "Endereço (opcional)" → **"Criar Tarefa ✓"**. API: `POST /api/app/crm/[id]/tasks`. Marcar concluída: checkbox no card "Tarefas" (`PATCH /api/app/crm/[id]/tasks/[taskId]` com `{ done: true }`).

Modelo Prisma: `CrmNota` (`texto`, `tipo` default `"anotacao"`) e `CrmTask` (`descricao`, `dueAt`, `done`, `linkReuniao`, `endereco`).

### 2.5 Automações, alertas e follow-up visíveis na UI (CRM principal)

- Card **"Agenda"**: "📅 Retorno agendado" com data/hora se `retornoAt` preenchido; "Último contato: {data}". Botão **"+ Agendar retorno"** → modal com "Data \*", "Horário", "Próxima Ação".
- **Badge de SLA** no Kanban/detalhe: `🚨{X}d` (vencido, vermelho) ou `⚠️{X}d` (≥75% do prazo, âmbar), calculado por `lib/crm/sla-config.ts`.
- **Verificação automática de SLA**: ao carregar `/dashboard/crm`, dispara `GET /api/app/crm/sla-check`, que varre leads com SLA vencido e cria automaticamente `CrmTask` (prefixo `[SLA]`) e `CrmNota` tipo `alerta`. Vencido 48h+ → marca "ESCALADO".
- **"🎯 Apresentação Comercial"**: link rastreável por e-mail/WhatsApp/Instagram/LinkedIn/link direto, com métricas (Acessos, Tempo, Scroll) e **Lead Score** (0–100: 🔥 Quente ≥70, 🌡️ Morno ≥40, ❄️ Frio <40 — `lib/crm/lead-score.ts`).
- **"💬 Mensagem sugerida" (Follow-up Inteligente)**: sugestão automática de mensagem por WhatsApp/e-mail (`lib/crm/followup-messages.ts`, `detectarSituacao`). Botões: "📋 Copiar", "📱 WhatsApp", "📧 E-mail", "🔗 Copiar Link", "✅ Marcar follow-up como realizado" (agenda automaticamente o próximo `retornoAt`).
- **Motivo de perda estruturado**: modal com botões pré-definidos (Preço, Concorrência, Timing/Momento, Sem resposta, Não qualificado, Outro) + textarea livre.
- **Forecast de MRR**: cards "MRR Forecast", "MRR Confirmado", "Pipeline Ativo" (probabilidade por etapa, `PROB_ETAPA` inline no `page.tsx`).

### 2.6 CRM Franquias (`franquia-crm`)

**Propósito confirmado pelo código** (comentário literal no schema Prisma, linha 823-825): *"CRM DE VENDA DE FRANQUIAS — Separado do CrmLead (que é para parcerias empresariais). Leads captados de tráfego pago (Meta Ads), indicações ou orgânico."* Ou seja: **não é sobre relacionamento com franquias já existentes** — é o funil de **vendas de novas unidades franqueadas Smarter**.

**Acesso — CONFIRMADO restrito a FRANQUEADORA.** Todas as rotas de API fazem checagem explícita `if (session.user.role !== "FRANQUEADORA") return 403`. FRANQUEADO e FUNCIONARIO não têm acesso nenhum.

**Pipeline de 6 etapas** (`lib/crm/franquia-pipeline.ts`):

| Ordem | Chave | Label | SLA (dias) |
|---|---|---|---|
| 1 | `novo_lead` | "Novo Lead" 🆕 | 1 |
| 2 | `primeiro_contato` | "Primeiro Contato" 📞 | 3 |
| 3 | `apresentacao` | "Apresentação do Negócio" 🎯 | 7 |
| 4 | `due_diligence` | "Due Diligence" 🔍 | 14 |
| 5 | `proposta` | "Proposta Financeira" 📋 | 7 |
| 6 | `fechado` | "Contrato Assinado" 🏆 | 0 |

**Criar lead manual**: `/dashboard/franquia-crm` → **"+ Novo Lead"** → modal "Novo Lead de Franquia" (Nome completo \*, E-mail, WhatsApp, Cidade, Estado, Origem: Manual/Meta Ads/Indicação/Orgânico/Evento) → **"Criar Lead"**. API: `POST /api/app/franquia-crm`.

**Mover de etapa**: página de detalhe, card **"Mover Etapa"** — lista de botões (não select, não drag-and-drop).

**Marcar Vendido/Perdido**: botões **"✅ Marcar Vendido"** e **"❌ Perdido"** no mesmo card. Perdido abre modal com textarea de motivo.

**Notas e tarefas**: seção "Adicionar Registro" (textarea + select de tipo: "📝 Anotação", "✉️ E-mail (manual)", "💬 WhatsApp", "⚠️ Alerta" → "Salvar") e seção "Nova Tarefa / Follow-up" (texto + data + "+ Tarefa"). Tarefas pendentes em "📋 Tarefas Pendentes" com "✓ Concluir". Tudo consolidado em "📅 Timeline".

**Importação** (`franquia-crm/importar`) — CONFIRMADO: importação de CSV (aceita `.csv`, `.tsv`, `.txt`), pensada primariamente para leads do Meta Ads, mas com origens alternativas.
1. Acesse `/dashboard/franquia-crm/importar` (link **"📥 Importar CSV"** na lista).
2. Arraste o arquivo ou clique na área tracejada.
3. Escolha a "2. Origem dos leads": Meta Ads (Facebook/Instagram) / Google Ads / Evento/Feira / Indicação / Orgânico (Site/Landing Page) / Outro.
4. Colunas aceitas (case-insensitive): `nome_completo`/`nome` (obrigatório), `telefone`/`celular`, `email`, `cidade`, `estado`/`uf`, coluna de data (`hora de criação`, `created_time`, `date_created`, `data`, `criado em`).
5. Clique em **"🚀 Importar Leads"**.
6. **Lead Frio**: se a data do lead for de mais de 6 meses atrás, marca `leadFrio: true` automaticamente (badge "🧊 Frio"). Lógica em `detectLeadFrio` (`app/api/app/franquia-crm/import/route.ts`).
7. Deduplicação por telefone/e-mail já existente.
8. Resultado: contadores Total/Importados/Duplicados/Erros + tabela linha a linha.

**Não confirmado**: não existe tela de importação equivalente para o CRM principal — só para `franquia-crm`.

### 2.7 Fluxo de entrada de lead via formulário público

Rota pública: `/lead` (`app/lead/page.tsx` + `LeadCapturaForm.tsx`). **Este formulário alimenta apenas o CRM PRINCIPAL (`CrmLead`), não o `franquia-crm`.** Não foi encontrado formulário público equivalente para captação de candidatos a franqueado.

1. Acessa `/lead` (opcionalmente `?ref=FRANCHISE_ID` para rotear a uma unidade, ou `?utm=`/`?origem=` para rastrear canal).
2. Preenche: "Nome da Empresa \*", "Seu Nome", "Cargo", "WhatsApp \*", "E-mail", "Cidade", "Setor da Empresa" (select), "Como podemos ajudar? (opcional)".
3. Marca checkbox de consentimento LGPD.
4. Clica **"Quero conhecer a Smarter →"** (desabilitado até empresa+telefone+opt-in).
5. Tela de sucesso: "🎉 Recebemos seu contato!".

API: `POST /api/public/lead`, rate limit 10 leads/minuto/IP. Roteamento: `?ref=` de franquia ATIVA → cai no CRM daquele FRANQUEADO; sem ref ou inválido → cai na FRANQUEADORA.

No CRM principal, botão **"🔗 Link Captação"** abre modal com links prontos por canal ("🔗 Link principal", "📱 Instagram / Bio", "💰 Tráfego pago (Meta/Google)", "🤝 Equipe comercial", "💬 WhatsApp / Mensagem"), cada um com "Copiar" e "📱 Enviar no WhatsApp".

### 2.8 Schema Prisma — models relevantes (CRM)

- **`model CrmLead`** (tabela `crm_leads`): `empresa`, `contato`, `cargo`, `email`, `telefone`, `whatsapp`, `instagram`, `linkedin`, `cidade`, `uf`, `etapa` (string livre), `prioridade` (default "media"), `valorNegociado`, `retornoAt`, `ultimoContato`, `proximaAcao`, `anotacao`, `franchiseId`, `companyId`, `convertido`, `situacao` (default "ativo": ativo|vendido|perdido|pausado), `etapaChangedAt`, `optIn`/`optInAt`, `origem`, `setor`, `contratoHtml`, bloco de Apresentação Comercial (`apresentacaoToken`, `apresentacaoCanal`, métricas, `leadScore`). Relações: `company`, `franchise`, `notas`, `tasks`, `apresentacaoEventos`.
- **`model ApresentacaoEvento`**: `tipo` (abriu|scroll_25|scroll_50|scroll_75|chegou_ao_fim|clicou_whatsapp|clicou_agendamento|clicou_vaga|ping_tempo), `ip`, `userAgent`, `extra`.
- **`model CrmNota`**: `texto`, `tipo` (default "anotacao"; valores: anotacao|ligacao|email|reuniao|whatsapp|etapa|alerta).
- **`model CrmTask`**: `descricao`, `dueAt`, `done`, `linkReuniao`, `endereco`.
- **`model FranquiaLead`** (tabela `franquia_leads`): `nomeCompleto`, `email`, `telefone`, `cidade`, `estado`, `etapa` (default "novo_lead"), `situacao` (default "ativo"; comentário: ativo|vendido|perdido), `origem` (comentário: meta_ads|indicacao|organico|evento|outro), `leadFrio` (Boolean default false), `optIn` (default true), `anotacao`, `proximaAcao`, `ultimoContato`, `retornoAt`, `etapaChangedAt`, `valorInvestimento`.
- **`model FranquiaNota`**: `texto`, `tipo` (default "anotacao"; comentário: anotacao|email|whatsapp|etapa|alerta).
- **`model FranquiaTarefa`**: `descricao`, `dueAt`, `done`.

**Não confirmado**: não há enum Prisma formal para etapas/situações de nenhum dos dois CRMs — todos os valores são `String` livre, controlados só pelas constantes TypeScript.

### 2.9 Roles e acesso (CRM)

**CRM principal (`/api/app/crm/*`)** — usa `checkPermission(session, "crm")`:
- FRANQUEADORA: acesso total, vê leads com `franchiseId = null`.
- FRANQUEADO: acesso total ao módulo, mas só vê leads com `franchiseId` da própria sessão (ownership check em `app/api/app/crm/[id]/route.ts`).
- FUNCIONARIO/EQUIPE: condicionado a ter `"crm"` no array `permissoes`.
- EMPRESA/ESTUDANTE: sem acesso (403).

**Ranking de Unidades** (`/dashboard/crm/franqueadora`) — CONFIRMADO restrito exclusivamente a `role === "FRANQUEADORA"` (checagem direta de role, comentário explícito no código).

**CRM Franquias** (`/api/app/franquia-crm/*`) — CONFIRMADO restrito exclusivamente a `role === "FRANQUEADORA"` em toda rota (GET/POST/PATCH/DELETE/import). Sem checagem por `permissoes` — bloqueio total de role para os demais.

**Formulário público** (`/lead`, `POST /api/public/lead`): sem autenticação, só rate limit.

### Observações finais / pontos não confirmados (CRM)
- Não há visão agregada tipo "Ranking de Unidades" no CRM Franquias — parece funil único.
- Botão de importação diz "📥 Importar CSV" na listagem, mas o título da própria página é "📥 Importar Leads do Meta Ads" — ferramenta genérica pensada primariamente para Meta Ads.
- Não encontrada automação de e-mail/WhatsApp automática por mudança de etapa no `franquia-crm` (diferente do CRM principal); envios lá são sempre manuais.
- Não encontrada rota equivalente a `crm/sla-check` para o `franquia-crm` — o SLA parece calculado só no client-side, sem alertas automáticos confirmados.

---

## 3. PROCESSOS SELETIVOS E VAGAS

### 3.1 Como se abre uma vaga nova

**Quem pode**: apenas usuários internos da franquia (FRANQUEADORA, FRANQUEADO, FUNCIONARIO) logados no dashboard. A empresa **não** cria vaga diretamente — ela só "solicita" (seção 3.6). A rota `POST /api/app/vagas` exige apenas `session.user.franchiseId`; **não há checagem explícita de `role` nem de módulo `"vagas"` no `PERMISSION_MAP`** — diferente da rota de processos, que usa `checkPermission(session, "processos")`.

Passo a passo (equipe da franquia):
1. Acesse `/dashboard/vagas`.
2. Clique em **"+ Nova Vaga"** → `/dashboard/vagas/nova`.
3. Preencha (rótulos exatos do JSX):
   - **"Título da Vaga \*"**, "Função", "Área" (select `AREAS`)
   - **"Nível de Ensino (Lei 11.788/08) — selecione um ou mais"** (checkboxes, lista `NIVEIS_ENSINO`)
   - Se "Ensino Técnico" marcado → bloco "Cursos Técnicos"; se "Ensino Superior" → "Cursos Superiores" (multi-select com filtro + opção "Outro")
   - **"Empresa \*"** (select, só empresas `status === "ATIVA"`)
   - "Modalidade" (Presencial/Híbrido/Remoto)
   - "Perfil DISC desejado" (D/I/S/C ou "Qualquer perfil") + botão de IA **"DISC Ideal"**
   - "Descrição da Vaga" (textarea) + botão de IA **"Gerar descrição com IA"**
   - "Requisitos" (textarea) + botão de IA **"Sugerir Requisitos"**
   - Bloco tracejado "Sugestão de Testes Seletivos" (obs: *"Apenas para uso interno da unidade — não aparece na divulgação da vaga"*) + botão **"Sugerir Testes Seletivos"**
   - "Bolsa (R$) \*", "Aux. Transporte (R$)", "Benefícios", "C.H. Diária (máx. 6h)" (select 4h/5h/6h, recalcula C.H. Semanal automaticamente), "Horário", "Dias da Semana" (presets + "Personalizado"), "Cidade", "UF"
4. Clique em **"Publicar Vaga"** (desabilitado durante `loading`; muda para "Publicando...").
5. Validação obrigatória client-side: Título, Empresa, Bolsa.
6. `POST /api/app/vagas` cria via `createVacancy()` (`lib/actions/vacancies.ts`), gerando automaticamente um `publicSlug` — toda vaga já nasce com link público.
7. Redireciona para `/dashboard/vagas/{id}`.

**Papel da IA no formulário** (componente `AIButton`): cada botão abre painel editável com **"🔄 Regenerar"**, **"📋 Copiar"**, **"✕"**, **"✓ Aplicar texto"** — só aplica ao campo quando o usuário confirma ("✓ Aplicar texto"), nunca automaticamente.
- **"DISC Ideal"** → `/api/app/ai/disc-perfil` (prompt exato não confirmado nesta investigação).
- **"Gerar descrição com IA"** → `/api/app/ai/vaga-descricao` — aplica em `descricao`.
- **"Sugerir Requisitos"** → `/api/app/ai/sugestao-requisitos` — concatena ao campo `requisitos` existente.
- **"Sugerir Testes Seletivos"** → `/api/app/ai/sugestao-testes` — resultado **não é salvo na vaga**, fica local; aviso âmbar "✓ Testes gerados — apenas para uso interno da unidade" com **"📄 Baixar PDF"** (impressão via navegador).
- Todas exigem sessão + `session.user.franchiseId`; sem franquia → 403.

**Editar vaga**: `/dashboard/vagas/{id}` → botão **"✏️ Editar Vaga"** (`VagaActions.tsx`) → modal com os mesmos campos (sem IA) → **"💾 Salvar Alterações"** → `PATCH /api/app/vagas/{id}`.

**Ações de status** (`VagaActions.tsx`): **"⏸ Pausar Vaga"** (se ABERTA) / **"▶ Reabrir Vaga"** (se PAUSADA) / **"✕ Encerrar Vaga"** (se não ENCERRADA) / **"↩ Reabrir"** (se ENCERRADA). Botão **"🔗 Link de Divulgação"** (se `publicSlug` existir) → modal com link `/vaga/{slug}` + **"📋 Copiar Link"**/**"✓ Copiado!"** + **"📱 WhatsApp"**.

### 3.2 Estrutura EXATA do Kanban de processos seletivos

**Confirmado: continua Kanban de 5 etapas**, array no componente `app/dashboard/processos/page.tsx` (não enum Prisma):
```
Inscritos → Triagem → Entrevista → Aprovado ✓ → Reprovado
```
(chaves: `inscritos`, `triagem`, `entrevista`, `aprovado`, `reprovado`).

No Prisma (`model Application`), o campo `etapa` é `String? @default("inscritos")` — string livre, sem enum, validação só no front. Em `/portal-estudante/candidaturas` existe mapeamento paralelo de labels para o estudante: "Inscrito", "Em Triagem", "Entrevista", "Aprovado ✓", "Reprovado" (mesmas 5 chaves, texto ligeiramente diferente).

### 3.3 Como uma candidatura se move entre etapas

**Mecanismo confirmado: dropdown `<select>` por card, NÃO drag-and-drop** (sem `draggable`/`onDragStart`/lib de dnd no código).

1. Em `/dashboard/processos` (ou `?vagaId=X` via botão "🎯 Processo Seletivo" na página da vaga), cada card tem na parte inferior um `<select>` com as 5 etapas.
2. Trocar a opção dispara `moverEtapa(c.id, e.target.value)` → `PATCH /api/app/processos/{id}` com `{ etapa: novoValor }`.
3. Dentro do **modal de detalhe da candidatura** existe outro campo separado, **"Recomendação"** (select: "Sem definição", "✓ Aprovado", "⏳ Em análise", "✗ Reprovado") — campo distinto (`recomendacao`), não a etapa do Kanban. Exige clicar em "Salvar ✓" para persistir.

**Importante para a Lia não confundir**: "etapa" (coluna do Kanban) e "recomendação" (campo dentro do modal) são dois campos diferentes no banco (`etapa` e `recomendacao` em `Application`).

### 3.4 Parecer técnico — duas ações distintas

Abre-se clicando num card do Kanban → Modal "Candidatura" (`size="xl"`) com abas.

**A) "📄 Gerar Parecer"** (sempre visível, fora das abas): executa `gerarParecer()` **inteiramente client-side** — monta HTML com dados do candidato/vaga, anotações, avaliação técnica, recomendação, e (se houver `discResult`) um relatório DISC comportamental completo (radar SVG, barras D/I/S/C etc.). Abre em nova aba e chama `window.print()` — usuário salva como PDF pelo navegador. **Não usa IA, não é gerado no servidor.**

**B) "Melhorar parecer com IA"** — dentro da aba **"📋 Parecer"** (das 3 abas: "📝 Anotações", "📅 Agendamento", "📋 Parecer"). Campo "Avaliação Técnica completa" (textarea, `parecerTecnico`) + botão de IA `AIButton` → `POST /api/app/ai/parecer` (prompt `AI_PROMPTS.parecerTecnico`, envia `parecerAtual`, `candidato`, `vaga`, `empresa`, `etapa`, `anotacao`). Desabilitado se não houver `parecerTecnico` nem `anotacao`.

**O que é salvo**: botão comum **"Salvar ✓"** no rodapé do modal → `PATCH /api/app/processos/{id}` envia `anotacaoInterna`, `anotacao`, `entrevistaAt`, `entrevistaLocal`, `entrevistaLink`, `recomendacao`, `parecerTecnico`.

Campos da aba "📝 Anotações": **"Anotação Interna (não aparece no parecer)"** (`anotacaoInterna`) e **"Anotação para o Parecer Técnico"** (`anotacao` — essa sim entra no parecer/PDF).

### 3.5 Agendamento de entrevista

Mesmo Modal "Candidatura", aba **"📅 Agendamento"**: "Data da Entrevista", "Horário", "Local (endereço ou nome)", "Link de Reunião (opcional)". Se preenchidos, mostra confirmação "📅 Agendado para {data/hora}" com link "Entrar na reunião" se houver. Salva pelo botão comum "Salvar ✓" → `PATCH /api/app/processos/{id}`.

**Notificação**: **não há envio automático de e-mail/SMS confirmado no código** ao agendar (a rota só faz `prisma.application.update`). O que existe: o estudante vê a entrevista em `/portal-estudante/candidaturas` (box âmbar "📅 Entrevista agendada"); a equipe vê aviso "⏰ Entrevistas hoje ({N})" no topo do Kanban; há botão de WhatsApp manual com mensagem genérica de convite (não inclui data/hora automaticamente) — envio é sempre manual, clicado pelo operador.

### 3.6 Como a empresa SOLICITA uma vaga — dois fluxos distintos e não integrados

**Fluxo A — Link público `/solicitar-vaga` (sem login)**
1. Na ficha da empresa (`/dashboard/empresas/{id}`, `EmpresaActions.tsx`), botão **"📋 Copiar Link de Solicitação de Vaga"** (vira "✅ Link Copiado!" por 2,5s). Link: `{origin}/solicitar-vaga?empresa={empresaId}`.
2. Equipe envia o link à empresa (fora do sistema).
3. Empresa abre `/solicitar-vaga?empresa=X` (sem login). Sem `?empresa=` → erro "Link inválido".
4. Preenche 4 blocos: **"📋 Dados da Vaga"** (Função/Cargo \*, Atividades \*, Valor da Bolsa \*, Auxílio Transporte, Horário \*, Carga Horária Semanal, Dias de Trabalho \*, Benefícios, Modalidade), **"🎓 Perfil do Candidato"** (Curso Desejado, Preferência de Gênero, Nível de Ensino), **"👤 Supervisor do Estagiário"** (Nome \*, Cargo, E-mail, Telefone/WhatsApp), Observações.
5. Clica **"Enviar Solicitação de Vaga →"** → `POST /api/public/solicitar-vaga` (rate-limit 5/min/IP) → cria `VagaSolicitacao` (status `PENDENTE`).
6. Tela de sucesso: "✅ Solicitação enviada!".
7. **Do lado da equipe**: card **"📋 Solicitações de Vaga ({N})"** na ficha da empresa (`SolicitacoesVaga.tsx`), badge de status (Pendente/Convertida em Vaga/Rejeitada). Expandindo: **"🖨️ Imprimir / PDF"**, **"✅ Abrir como Vaga"** (converte automaticamente `VagaSolicitacao` → `Vacancy` status `ABERTA`, vincula `vagaId`), **"❌ Rejeitar"**.

**Fluxo B — Portal da Empresa `/portal-empresa/solicitar` (já logada)**
1. Preenche: Título da Vaga \*, Área, Modalidade, Descrição das atividades, Requisitos, Bolsa \*, Horário, Cidade, Observações.
2. Clica **"Enviar Solicitação →"** → `POST /api/portal/empresa/solicitar-estagiario`.
3. **Este fluxo NÃO cria `VagaSolicitacao`** — apenas cria uma `Notification` (título "🎯 Nova Solicitação de Estagiário — {empresa}") para todos os `FRANQUEADO`/`FUNCIONARIO` da franquia (a FRANQUEADORA não é notificada, por design explícito no código).
4. Tela de sucesso: "🎉 Solicitação Enviada!", botão "+ Nova Solicitação".
5. **Não há conversão automática em vaga** — a equipe precisa ler a notificação e criar a vaga manualmente via `/dashboard/vagas/nova`. Não confirmado nenhum botão que pré-preencha o formulário a partir da notificação.

### 3.7 Como o estudante se candidata a uma vaga

**Entrada 1** — lista pública `/vagas` (sem login): vagas `ABERTA`, filtros Estado/Área/Cidade, botão "🔍 Buscar Vagas". Card: **"Ver Vaga e Candidatar-se →"** → `/vaga/{slug}`.

**Entrada 2** — página individual `/vaga/[slug]` (sem login):
1. Detalhes da vaga.
2. Se `status === "ABERTA"`: bloco "Candidatar-se a esta vaga" com **"Já tenho cadastro"** (login com e-mail/senha → `POST /api/public/vaga/inscrever`) ou **"Quero me cadastrar"** (Nome, E-mail, Curso, senha → `POST /api/public/vaga/inscrever-novo`, cria User+Student+Application em transação).
3. Se não `ABERTA`: "Esta vaga não está aceitando inscrições no momento."
4. Sucesso: "🎉 Inscrição Realizada!" com link "Acessar o portal →".

**Entrada 3** — já logado, `/portal-estudante/vagas`: lista vagas `ABERTA` com % de match (DISC/curso); botão **"Me inscrever"** (`VagaInscricaoButton`) → `POST /api/app/vagas/{id}/inscrever` (exige role ESTUDANTE, valida vaga aberta, impede duplicidade, calcula matching). Feedback via `alert()`.

**Acompanhamento** — `/portal-estudante/candidaturas`: lista até 50 `Application`, com título da vaga, empresa/cidade, bolsa, data, badge de etapa ("Inscrito"/"Em Triagem"/"Entrevista"/"Aprovado ✓"/"Reprovado"), % match. Se `entrevistaAt`: box âmbar "📅 Entrevista agendada". Se `recomendacao` ≠ "em_analise": box verde ("Parabéns! Você foi aprovado(a)") ou vermelho (não avançou), com a `anotacao` (não a `anotacaoInterna`, que fica oculta).

**Nota**: existe rota interna `POST /api/app/processos/candidatar` para a equipe candidatar um estudante manualmente (ESTUDANTE só a si mesmo, EMPRESA bloqueada, FRANQUEADO/FUNCIONARIO só estudantes da própria franquia). **Não localizada** a tela do dashboard que chama esse endpoint especificamente.

### 3.8 Schema Prisma — campos e enums relevantes (Vagas/Processos)

- **`model Vacancy`** (`vacancies`): `titulo`, `funcao?`, `area?`, `descricao?`, `requisitos?`, `beneficios?`, `modalidade? @default("Presencial")`, `bolsa Float`, `auxTransporte?`, `cargaHoraria? @default(30)`, `chDiaria? @default(6)`, `horario?`, `diasSemana?`, `cidade?`, `uf?`, `endereco?`, `discDesejado?`, `nivel?` (JSON serializado), `cursoRequerido?` (JSON serializado), `status VacancyStatus? @default(ABERTA)`, `companyId`, `franchiseId`, `publicSlug?`, `applications Application[]`.
- **`enum VacancyStatus`**: `ABERTA | PAUSADA | ENCERRADA`.
- **`model Application`** (`applications`): `studentId`, `vacancyId`, `etapa String? @default("inscritos")` (livre, sem enum), `matching Int?`, `anotacao?`, `anotacaoInterna?`, `parecerTecnico?`, `entrevistaAt DateTime?`, `entrevistaLocal?`, `entrevistaLink?`, `recomendacao?` (livre: aprovado|em_analise|reprovado), `status? @default("ativo")`. `@@unique([studentId, vacancyId])` — impede candidatura duplicada.
- **`model VagaSolicitacao`** (`vaga_solicitacoes`): `companyId`, `franchiseId?`, `funcao`, `atividades`, `bolsa`, `auxTransporte?`, `horario`, `diasTrabalho`, `cargaHoraria? @default(30)`, `beneficios?`, `modalidade? @default("Presencial")`, `cursoDesejado?`, `preferenciaGenero?` (masculino/feminino/indiferente, sem enum), `nivel?` (fundamental/medio/superior/pos, sem enum), `observacoes?`, `supervisorNome`, `supervisorCargo?`, `supervisorEmail?`, `supervisorTel?`, `status String @default("PENDENTE")` (PENDENTE|CONVERTIDA|REJEITADA, sem enum), `vagaId?`.

### 3.9 Roles com acesso (Vagas/Processos)

| Rota / Área | Checagem | Roles permitidos |
|---|---|---|
| `GET/POST /api/app/vagas` | `POST` exige `franchiseId`; sem `checkPermission("vagas")`, sem checagem de role explícita | Qualquer logado com `franchiseId` |
| `PATCH /api/app/vagas/[id]` | Role em lista explícita + ownership | FRANQUEADORA, FRANQUEADO, FUNCIONARIO (não-FRANQUEADORA só da própria franquia) |
| `GET /api/app/processos` | `checkPermission(session, "processos")` | FRANQUEADORA/FRANQUEADO total; FUNCIONARIO/EQUIPE com permissão `"processos"` |
| `PATCH /api/app/processos/[id]` | Role explícita + ownership | FRANQUEADORA, FRANQUEADO, FUNCIONARIO |
| `POST /api/app/processos/candidatar` | Regras por role | ESTUDANTE só a si mesmo; EMPRESA bloqueada; FRANQUEADO/FUNCIONARIO só da própria franquia |
| `POST /api/app/vagas/[id]/inscrever` | Role | Só ESTUDANTE |
| `POST /api/public/vaga/inscrever` / `inscrever-novo` | Pública | Qualquer visitante |
| `POST /api/public/solicitar-vaga` | Pública, rate-limit 5/min/IP | Qualquer visitante com link válido |
| `POST /api/portal/empresa/solicitar-estagiario` | Role | Só EMPRESA logada |
| `GET/PATCH /api/app/empresas/[id]/solicitacoes*` / `abrir-vaga` | `checkPermission("empresas")` + escopo de franquia | FRANQUEADORA/FRANQUEADO total; FUNCIONARIO/EQUIPE com permissão |
| Rotas de IA (`/api/app/ai/*`) | Sessão + `franchiseId` | Qualquer logado vinculado a franquia — sem checagem de role/permissão específica |

**Não confirmado**: envio automático de notificação ao agendar entrevista; tela exata que chama `POST /api/app/processos/candidatar`; prompt/lógica de `/api/app/ai/disc-perfil`; ponte automática entre `Notification` do Fluxo B e criação de vaga.

---

## 4. CADASTRO DE ESTUDANTES, EMPRESAS E FRANQUIAS

### 4.1 Cadastro de estudante

Dois caminhos confirmados, **nenhum passa por aprovação** — o estudante fica `DISPONIVEL` (ativo) imediatamente em ambos.

**4.1.a Fluxo interno** (franqueado/equipe pelo dashboard) — relevante para franqueado, equipe com permissão "estudantes", franqueadora:
1. `/dashboard/estudantes` → **"+ Novo Estudante"** → `/dashboard/estudantes/novo`.
2. Formulário em 3 etapas (`EstudanteForm.tsx`): **"1. Dados Pessoais"**, **"2. Acadêmico"**, **"3. Acesso"**.
   - Etapa 1: Nome Completo \*, CPF (formatação automática), RG, Data de Nascimento, checkbox "Estagiário menor de idade" (exige Nome do Responsável Legal \*), Sexo, E-mail \*, Celular, CEP (busca automática de endereço), Endereço, Bairro, Cidade, UF.
   - Etapa 2: Curso \*, Período (1º a 10º), Previsão de Conclusão, Instituição de Ensino (select opcional), Observações.
   - Etapa 3: e-mail já preenchido + "Senha inicial (opcional — gerada automaticamente se vazio)". Avisos: "O estudante receberá acesso ao portal..." e "✅ Após salvar, o estudante já pode fazer login...".
3. **"Cadastrar Estudante ✓"** → `POST /api/app/estudantes`: cria User (role ESTUDANTE) + Student (`status: DISPONIVEL`), envia e-mail de boas-vindas com senha.
   - Comentário no código: estudante criado pelo dashboard sempre fica com `franchiseId: undefined` ("Estudantes sempre ligados ao Admin para não se perder ao excluir uma unidade").
4. Redireciona para `/dashboard/estudantes`.

Existe também botão **"📥 Importar Estudantes"** na listagem (`POST /api/app/estudantes/importar`, criação em massa).

Permissão: `checkPermission(session, "estudantes")`.

**4.1.b Auto-cadastro público** (`/cadastro/estudante`, aceita `?ref=<franchiseId>`) — relevante para o próprio estudante:
1. 5 etapas: **"1. Dados Pessoais"**, **"2. Endereço"**, **"3. Formação"**, **"4. Currículo"**, **"5. Acesso"**.
   - Dados Pessoais: Nome Completo \*, CPF, RG, Data de Nascimento, Sexo, E-mail \*, Celular \*, Telefone.
   - Endereço: Endereço, Bairro, Cidade \*, UF, CEP.
   - Formação: Instituição de Ensino \*, Curso \*, Período, Turno, Previsão de Conclusão, Disponibilidade.
   - Currículo: Objetivo Profissional, Habilidades, Idiomas, Experiências Anteriores, LinkedIn, Portfólio/GitHub. Aviso: "🧠 Seu perfil DISC será identificado após o acesso ao portal...".
   - Acesso: resumo + "Uma senha será gerada automaticamente ao finalizar."
2. **"Finalizar Cadastro ✓"** → `POST /api/public/estudante`:
   - Rate limit 5/min/IP; bloqueia e-mail duplicado (409).
   - Vincula à franquia do `ref` (ou fallback à primeira `ATIVO`).
   - **Instituição nunca é criada automaticamente** — só vincula se já existir (comentário: "Cadastro de instituições é feito manualmente na aba Instituição").
   - Gera senha temporária, cria User+Student `DISPONIVEL` — já ativo, sem aprovação.
   - Senha **não retorna na resposta HTTP** (só por e-mail) — comentário `SEC-A08`.
3. Tela de sucesso: "🎓 Cadastro Realizado!" → "Acessar o Portal →".

**Aprovação de estudante**: **não existe** em nenhum dos dois fluxos — sem campo "pendente" no model `Student`.

### 4.2 Cadastro de empresa

Dois caminhos, mas **aprovação obrigatória só no auto-cadastro público**.

**4.2.a Fluxo interno** (`/dashboard/empresas/nova`) — relevante para franqueado, equipe com permissão "empresas", franqueadora:
1. `/dashboard/empresas` → **"+ Nova Empresa"**.
2. `EmpresaForm.tsx`, 3 blocos: "Dados da Empresa" (Nome Fantasia \*, Razão Social, CNPJ \* com validação, Setor, E-mail \*, Telefone, E-mail Financeiro, Site), "Responsável" (Nome, Cargo), "Endereço" (CEP com lookup, Endereço, Bairro, Cidade \*, UF).
3. **"Cadastrar Empresa"** → `POST /api/app/empresas`: cria Company já `ATIVA` (default), cria User (role EMPRESA), dá 300 pontos de gamificação à franquia, envia e-mail de boas-vindas.
4. Redireciona para `/dashboard/empresas`.

Permissão: role em `["FRANQUEADORA","FRANQUEADO","FUNCIONARIO"]` + `checkPermission("empresas")`.

**4.2.b Auto-cadastro público** (`/cadastro/empresa`, aceita `?ref=`) — relevante para a própria empresa:
1. 3 etapas: "1. Dados da Empresa" (Nome Fantasia \*, Razão Social, CNPJ \*, Setor, E-mail Corporativo \*, Telefone, Site), "2. Responsável" (Nome \*, Cargo — aviso: "ℹ️ O responsável receberá as comunicações..."), "3. Endereço".
2. **"Enviar Cadastro ✓"** → `POST /api/public/empresa`:
   - Bloqueia CNPJ duplicado (409). Vincula franquia do `ref` (ou fallback).
   - Cria Company com **`status: "PENDENTE"` e `pendente: true`** (confirmado literalmente).
   - Cria automaticamente `CrmLead` (etapa "novo_lead", prioridade "alta", anotação "Lead gerado via auto-cadastro público").
   - **Não cria usuário de login** nessa etapa.
3. Tela de sucesso: "🎉 Cadastro Enviado!".

**Aprovação da empresa auto-cadastrada**:
1. Na listagem, empresas `pendente: true` aparecem destacadas com badge amarela "Auto cadastro".
2. Ficha (`/dashboard/empresas/[id]`): badge "Pendente aprovação" no cabeçalho.
3. Card "Ações" (`EmpresaActions.tsx`): botão **"✓ Aprovar Empresa"** (só se `pendente`).
4. Clicar → `PATCH /api/app/empresas/{id}` com `{ pendente: false, status: "ATIVA" }`.
5. Depois de aprovada: botão **"🔑 Criar Acesso ao Portal"** (se ainda sem usuário) → `POST /api/app/empresas/{id}/acesso`, confirmação via `confirm()`: "Criar acesso ao portal para {empresa}? Um e-mail com a senha será enviado para {email}."

**Quem pode aprovar (não claramente restrito)**: a rota `PATCH /api/app/empresas/[id]` **não chama `checkPermission`**, só exige sessão + ownership de franquia (se não-FRANQUEADORA). Ou seja, qualquer usuário autenticado da franquia dona (FRANQUEADO, FUNCIONARIO ou EQUIPE) consegue aprovar, mesmo sem a permissão granular "empresas" habilitada — a UI não restringe o botão por role, diferente do botão "Excluir Empresa" (só `isFranqueadora`).

### 4.3 Cadastro de franqueado/franquia

Relevante para: **exclusivamente FRANQUEADORA** (confirmado na página com `redirect` e em todas as rotas de API).

1. `/dashboard/franqueados` → **"+ Novo Franqueado"** → `/dashboard/franqueados/novo`.
2. 3 cards: "Dados da Unidade" (Nome da Unidade \*, Razão Social, CNPJ, Plano: basico/completo/premium, Mensalidade default 200), "Responsável e Acesso" (Nome \*, CPF \* validado, Data de Nascimento, E-mail de Contato \*, E-mail de Login se diferente, Telefone, Senha inicial opcional), "Endereço" (Endereço, Cidade \*, UF, CEP com lookup).
3. Aviso fixo: "✉️ Após cadastrar, o sistema envia automaticamente o e-mail de boas-vindas... Caso o e-mail não chegue, use o botão 'Reenviar Boas-Vindas'..."
4. **"Cadastrar Franqueado"** → `POST /api/app/franqueados`: valida e-mail único, cria Franchise+User (role FRANQUEADO) em transação (`prisma.$transaction`), gera senha, envia e-mail.
5. Tela de sucesso "🎉 Franqueado Cadastrado!" mostra login+senha na tela ("⚠️ Anote a senha — ela não será exibida novamente."), botões "Ver Lista" / "+ Novo Franqueado".

### 4.4 Edição — onde e por quem

**Estudante**:
- Dashboard (`/dashboard/estudantes/[id]`): **"✏️ Editar Dados"** (disponível para todas as unidades) → modal completo → `PATCH /api/app/estudantes/{id}`. Botões extras: "📧 Alterar E-mail Login", "🔑 Alterar Senha", "📩 Enviar Acesso ao Painel". "♻️ Reativar" (só `isFranqueadora` + status `INATIVO`). "🗑️ Excluir" (só `isFranqueadora`).
- Próprio estudante em `/portal-estudante/curriculo` (abas: Dados Pessoais, Formação, Experiência, Habilidades) — e-mail é somente leitura. **"💾 Salvar Currículo"** → `PATCH /api/portal/estudante/perfil`.

**Empresa**:
- Dashboard: **"✏️ Editar Dados"** reaproveita `EmpresaForm`, mas edição usa **server action `updateCompany`** (não a rota POST). Outros botões: "📧 Alterar E-mail Login", "🔑 Alterar Senha Portal", "📋 Copiar Link de Solicitação de Vaga", "⛔ Inativar"/"✓ Reativar", "✉️ Enviar E-mail", "🗑️ Excluir Empresa" (só `isFranqueadora`).
- **Não existe tela de auto-edição da empresa no portal-empresa** (confirmado — sem menu "Perfil"/"Meus Dados", sem rota `api/portal/empresa/perfil`). A empresa não edita o próprio cadastro pelo portal.

**Franquia**:
- Só FRANQUEADORA, em `/dashboard/franqueados/[id]`: "✏️ Editar Dados", "📧 Alterar E-mail Login", "🔑 Alterar Senha", "🔑 Criar Acesso" (se órfã), "✉️ Reenviar Boas-Vindas", "🔒 Bloquear Acesso"/"🔓 Liberar Acesso", bloco de bloqueio por inadimplência, toggle "Cobrar Mensalidade", "🗑️ Excluir Franqueado". **Não há auto-edição pelo próprio franqueado** — não confirmado se existe em outro lugar não explorado.

### 4.5 Schema Prisma — campos e enums (Cadastros)

- **`model Student`**: `id, userId, name, cpf (@unique), rg, dataNasc, sexo, email, telefone, celular, endereco, bairro, cidade, uf, cep, curso, periodo, semestre, previsaoConclusao, institutionId, franchiseId, discResult, discData (Json), curriculo (Json), habilidades (String[]), idiomas (Json), observacoes, status (StudentStatus? @default(DISPONIVEL)), menorDeIdade (Boolean @default(false)), nomeResponsavel, linkedin, portfolio, experiencias (Json), formacoes (Json), objetivos, partnerConsentStatus, partnerConsentAt`. **Não existe campo `pendente`.**
- **`enum StudentStatus`**: `DISPONIVEL, EM_PROCESSO, EM_ESTAGIO, FINALIZADO, INATIVO`.
- **`model Company`**: `id, name, razaoSocial, cnpj (@unique), setor, email, telefone, responsavel, cargoResponsavel, endereco, bairro, cidade, uf, cep, site, status (CompanyStatus? @default(ATIVA)), franchiseId, pendente (Boolean? @default(false)), emailFinanceiro, valorGestao, cpsStatus, cpsAuthDocId, cpsSignedUrl`.
- **`enum CompanyStatus`**: `ATIVA, INATIVA, ATENCAO, PENDENTE`.
- **`model Franchise`**: `id, name, razaoSocial, cnpj (@unique), cpf, dataNasc, responsavel, email, telefone, whatsapp, instagram, cidade, uf, endereco, cep, status (FranchiseStatus? @default(ATIVO)), mensalidade (default 200), cobrarMensalidade (default true), diaVencimentoTaxa (default 10), acessoBloqueado (default false), bloqueadoEm, bloqueioMotivo, bloqueioLiberadoAte, plano (default "completo"), pontuacao (default 0), chavePix, linkPagamento, instrucaoPagamento`.
- **`enum FranchiseStatus`**: `ATIVO, INATIVO, ATENCAO`.
- **`enum UserRole`**: `FRANQUEADORA, FRANQUEADO, EMPRESA, ESTUDANTE, FUNCIONARIO, EQUIPE`.

### 4.6 Resumo de permissões por rota (Cadastros)

| Ação | Rota API | Quem pode |
|---|---|---|
| Listar/criar estudante | `GET/POST /api/app/estudantes` | FRANQUEADORA/FRANQUEADO total; FUNCIONARIO/EQUIPE com permissão "estudantes" |
| Auto-cadastro estudante | `POST /api/public/estudante` | Público, rate-limited 5/min/IP |
| Editar estudante | `PATCH /api/app/estudantes/[id]` | Autenticado + ownership; alterar `status` exige FRANQUEADORA |
| Excluir estudante | `DELETE /api/app/estudantes/[id]` | Apenas FRANQUEADORA |
| Listar/criar empresa | `GET/POST /api/app/empresas` | Role em lista + `checkPermission("empresas")` |
| Auto-cadastro empresa | `POST /api/public/empresa` | Público — cria PENDENTE |
| Aprovar/editar empresa | `PATCH /api/app/empresas/[id]` | Qualquer sessão autenticada + ownership (sem checkPermission explícito) |
| Excluir empresa | `DELETE /api/app/empresas/[id]` | Apenas FRANQUEADORA |
| Listar/ver franqueados | `GET /api/app/franqueados` | Apenas FRANQUEADORA (unidade específica também permite o próprio FRANQUEADO ver a si) |
| Criar/editar/excluir franqueado | `POST/PATCH/DELETE /api/app/franqueados` | Apenas FRANQUEADORA |

### Pontos não confirmados (Cadastros)
1. Aprovação de empresa não checa permissão de módulo — só ownership de franquia; não está claro se é intencional.
2. Não há auto-edição de perfil da empresa no portal — não confirmado se é planejado e não implementado, ou decisão de produto.
3. Não há auto-edição de perfil do próprio franqueado — não localizado em nenhum lugar do código.
4. A tela de sucesso do auto-cadastro de estudante tem lógica para mostrar senha na tela, mas a API não retorna a senha no JSON — na prática o usuário sempre vê "sua senha foi enviada por e-mail".

---

## 5. MARKETING HUB E TRÁFEGO PAGO

### 5.0 Estrutura geral

Layout com sub-navegação fixa (`app/dashboard/marketing/layout.tsx`). Abas exatas, na ordem:

| Label exato | Rota | Ícone |
|---|---|---|
| `Hub` | `/dashboard/marketing` | LayoutDashboard |
| `Biblioteca` | `/dashboard/marketing/biblioteca` | Library |
| `Campanhas` | `/dashboard/marketing/campanhas` | Megaphone |
| `Tráfego Pago` | `/dashboard/marketing/trafego-pago` | Rocket |
| `Calendário` | `/dashboard/marketing/calendario` | CalendarDays |
| `Sugestões IA` | `/dashboard/marketing/sugestoes` | Lightbulb |
| `Notícias` | `/dashboard/marketing/noticias` | Newspaper |
| `Admin` (só se `isAdmin`) | `/dashboard/marketing/admin` | Settings2 |

Regra de admin (repetida em quase toda página do módulo):
```
isAdmin = role === "FRANQUEADORA" || (role === "EQUIPE" && permissoes?.includes("marketing"))
```
FRANQUEADO e demais roles têm acesso só de leitura/consumo.

### 5.1 Hub (`/dashboard/marketing`)

Banner com 3 contadores (Conteúdos, Downloads, Campanhas), 5 cards de atalho, bloco "Sugestões Inteligentes" (top 4), "Destaques", "Notícias da Rede" (top 3), e se admin, CTA "Gerenciar Marketing Hub" com botão **"Painel Admin"**.

### 5.2 Biblioteca (`/dashboard/marketing/biblioteca`)

3 abas internas: `📲 Redes Sociais` (POST_FEED, STORY, REELS, CARROSSEL, VIDEO, COPY), `🗂️ Biblioteca` (fixos + ARTE_PDF, TEMPLATE, MATERIAL_MARCA), `📢 Campanhas` (lista campanhas; clicar filtra materiais dela).

Filtros rápidos por tipo, busca com debounce 350ms, filtro por categoria (Todos/🎨 Marca/💼 Comercial/🎓 Recrutamento/🤝 Retenção/📅 Datas Especiais/🏢 Rede-Resultados/📦 Outros), botões "Destaques" e "Meus favoritos".

Fluxo de download: clicar no card → modal de detalhe → **"Favoritar"/"Favoritado"**, **"Baixar arquivo"** (registra em `POST /api/app/marketing/downloads`), **"Abrir link"** (se `url` existir). Hover no card revela ícones rápidos de favoritar/baixar.

### 5.3 Campanhas (`/dashboard/marketing/campanhas`)

Só admins veem **"+ Nova campanha"**: Nome \*, Descrição, Objetivo (🎯 Reconhecimento de marca / 💼 Conversão de leads / 🤝 Retenção de parceiros / 🎓 Recrutamento de estagiários), Status (Ativa/Rascunho/Encerrada), Início/Fim, Cor → **"Criar campanha"** → `POST /api/app/marketing/campanhas`. Filtro rápido: Todas/Ativa/Rascunho/Encerrada.

### 5.4 Calendário (`/dashboard/marketing/calendario`)

Grade mensal navegável (◀ ▶). Só admins veem **"+ Novo evento"**: Título \*, Data \* (datetime-local), Tipo (📸 Publicação/🎉 Data especial/📣 Campanha/🤝 Reunião), Descrição, Cor, checkbox "Evento recorrente (anual)" → **"Criar evento"** → `POST /api/app/marketing/calendario`. Exclusão via ícone de lixeira (confirm), só admin vê.

### 5.5 Sugestões IA (`/dashboard/marketing/sugestoes`)

Texto explicativo: *"O sistema analisa automaticamente seus dados: vagas sem candidatos, novos contratos, leads parados no CRM e datas comemorativas próximas — e recomenda o melhor conteúdo para postar no momento certo."* Tipos: `DATA_COMEMORATIVA`, `DIVULGACAO_VAGA`, `POS_CONTRATO`, `REENGAJAMENTO`, `CALENDARIO`, `ENGAJAMENTO`. Botão **"Atualizar"**. 100% leitura/consumo — sem criação manual (algoritmo de geração no backend não detalhado nesta investigação).

### 5.6 Notícias (`/dashboard/marketing/noticias`)

Só admins veem **"Publicar notícia"**: Título \*, Resumo (opcional), Corpo completo \*, Autor, URL da imagem, checkbox "Marcar como IMPORTANTE (envia notificação para todos)" → **"Publicar"** → `POST /api/app/marketing/noticias`. Notícias longas (>200 caracteres) usam `<details>` "Ler notícia completa".

### 5.7 Tráfego Pago (`/dashboard/marketing/trafego-pago`)

**100% somente leitura para todo usuário do sistema.** Subtítulo exato: *"Campanhas de Meta e Google Ads da rede/da sua unidade, gerenciadas pelo time de Tráfego Pago"*. Tabela: Campanha, Plataforma, Status, Orçamento/dia, Gasto total, Leads, CPL, ROAS.

**Origem dos dados**: model `MarketingTrafegoPago`, alimentado **externamente** via `POST /api/partners/campaigns` — API autenticada por Bearer token (não sessão do dashboard), usada pelo time de Tráfego Pago via integração própria. **Um franqueado ou franqueadora NÃO cria campanha de tráfego pago pela UI** — só visualiza. Se perguntarem "como crio uma campanha de tráfego pago", a resposta correta: não é possível pelo painel; o time de Tráfego Pago cadastra via integração e ela aparece automaticamente aqui.

Filtro de visibilidade: FRANQUEADORA vê `franchiseId: null` (rede); demais veem da própria franquia.

### 5.8 Admin (`/dashboard/marketing/admin`)

Só FRANQUEADORA/EQUIPE com permissão "marketing". 3 abas: `📲 Redes Sociais`, `🗂️ Biblioteca`, `📊 Métricas`. Botão principal muda: "Adicionar criativo" / "Adicionar material" / "Adicionar conteúdo".

Cotas de conteúdo rotativo ativo: REELS máx. 3, POST_FEED máx. 5, STORY máx. 20, CARROSSEL máx. 20 (biblioteca fixa não entra na cota).

Fluxo de cadastro: escolher Tipo de conteúdo (cards visuais) → Formato do arquivo (Imagem/Vídeo/PDF/Só texto/Link) + Categoria → upload (imagem/PDF até 20MB, vídeo até 200MB no front; limite real de envio: vídeo até 100MB, demais até 8MB por restrição da Vercel) ou colar URL → Descrição \* (obrigatório), Copy/Legenda, Hashtags, Canal ideal, Público (Todos/Apenas Franqueados/Apenas Franqueadora), Campanha vinculada, Tags internas → checkboxes "⭐ Marcar como destaque" e "🔒 Conteúdo fixo/Biblioteca" → **"Criar conteúdo"**/**"Salvar alterações"**.

Ações inline: ⭐ destaque, olho (ativar/ocultar), ✏️ editar, 🗑️ excluir (confirm). Aba "📊 Métricas": totais + ranking "Top Conteúdos por Download".

---

## 6. DOCUMENTOS GERADOS AUTOMATICAMENTE

### 6.1 Catálogo de documentos (fonte: `lib/documents/templates.ts`, `lib/actions/contracts.ts`)

| Código | Nome exato (salvo no banco) | Para que serve | Gerado automaticamente ao criar contrato? | Função geradora |
|---|---|---|---|---|
| `tce` | **Termo de Compromisso de Estagio** (TCE) | Documento principal, obrigatório por lei. 3 assinaturas (empresa, instituição, estudante); ao completar, ativa o contrato automaticamente. | Sim (slot) | `gerarTCE()` |
| `pe` | **Plano de Estagio** | Plano de atividades (mesmo gerador do TCE). | Sim (slot) | `gerarTCE()` |
| `ta` | **Termo Aditivo** | Altera cláusula do contrato. | Sim (slot) | `gerarTermoAditivo()` |
| `tr` | **Rescisao ao TCE** | Encerra o estágio antes do prazo — ao enviar para assinatura, contrato já fica INATIVO imediatamente. | Sim (slot) | `gerarRescisao()` |
| `rr` | **Recibo de Rescisao** | Valores calculados na Calculadora de Rescisão. | Sim (slot) | `gerarReciboRescisao()` |
| `rec` | **Termo de Recesso Remunerado** | Recesso/férias (mín. 12 dias trabalhados). | Sim (slot) | `gerarTermoRecesso()` |
| `rpb` | **Recibo de Pagamento de Bolsa** | Recibo mensal da bolsa-auxílio. | Sim (slot) | `gerarReciboBolsa()` |
| `re` | **Termo de Realizacao de Estagio** | Declaração de conclusão com avaliação de desempenho. | Sim (slot) | `gerarTermoRealizacao()` |
| `pt` | **Parecer Tecnico** | Parecer com recomendação (padrão "Aprovado"). | Sim (slot) | `gerarParecerTecnico()` |
| `as` | Avaliação Semestral | **Movido para formulário online no portal da empresa** — não é mais slot automático; preenchida via link `/portal-empresa/avaliacoes?contrato=`. | Não | `gerarAvaliacaoSemestral()` |
| `cps` | Contrato de Prestação de Serviços | **Movido para o cadastro da empresa** — não é slot do contrato de estágio. | Não | `gerarContratoPrestacao()` |

Também existem `gerarAvaliacaoRespondidaPDF()` e `lib/documents/disc-report.ts` (relacionado ao teste DISC, fora do escopo desta seção).

### 6.2 Onde e como cada documento é gerado/baixado

Todos os documentos (exceto `as` e `cps`) seguem o mesmo fluxo único, em `/dashboard/contratos/[id]/documentos/[docId]`:

1. Acesso: lista "📄 Documentos do Estágio" na ficha do contrato (`/dashboard/contratos/[id]`), clicando em **"Gerar"** (ainda não gerado) ou **"Ver"** (já gerado). Também acessível pela tela **Assinaturas** (`/dashboard/assinaturas`) via **"Abrir →"**.
2. Botão **"📄 Gerar"** (vira **"🔄 Regerar"** depois). Para tipos que exigem dados extras (`rpb`, `tr`, `rr`, `rec`, `re`, `ta`, `cps`), abre modal "Dados adicionais para geração" antes.
3. Depois de gerado: **"⬇ Baixar PDF"** (HTML em nova aba com auto-print — não é PDF gerado no servidor) e **"🖨 Imprimir"**.
4. **"✍️ Enviar para Assinatura"** — modal de envio via Autentique (assinatura digital com validade jurídica). Para TCE/Plano de Estágio: 3 campos fixos (Empresa, Instituição, Estudante); demais documentos: lista dinâmica de e-mails. Chama `POST /api/app/contratos/[id]/documentos/[docId]/autentique`.
5. Depois de enviado: **"🔄 Verificar Assinaturas"** — quando todos assinam, o TCE ativa o contrato automaticamente (ou, se Rescisão, o contrato vira INATIVO).
6. Com PDF assinado disponível: **"👁 Visualizar Assinado"** e **"⬇ Baixar Assinado (PDF)"**.
7. Alternativa manual (sem Autentique): botão **"✓ Marcar Assinado"**, disponível quando "AGUARDANDO_ASSINATURA".

**Downloads rápidos na ficha do contrato** ("⬇ Downloads Rápidos"): **"⬇ TCE"**, **"🖨 Imprimir TCE"**, **"⬇ Plano de Estágio"**, **"⬇ Rescisão"** (se já gerada), **"🧮 Calcular Rescisão"** (gera automaticamente o Recibo de Rescisão).

**Documentos físicos/migrados** (bloco "📎 Documentos Físicos / Ativar Estágio"): **"📎 Anexar Documento"** (upload de PDF, base64, `POST /api/app/contratos/[id]/migrar`), **"⚡ Ativar Estágio"** (`POST /api/app/contratos/[id]/ativar-migracao`, ativa sem exigir assinatura digital — usado para contratos migrados de outro sistema, `origem === "MIGRADO"`).

**Quem pode gerar/baixar**: sessão obrigatória; se role ≠ FRANQUEADORA, o contrato precisa pertencer à `franchiseId` da sessão. Não há endpoint de geração acessível por EMPRESA ou ESTUDANTE — eles só recebem link de assinatura por e-mail ou preenchem avaliação semestral pelo portal.

---

## 7. FINANCEIRO / COBRANÇA

### 7.1 Financeiro (`/dashboard/financeiro`)

Tela mais complexa do sistema. Papel muda conforme role (`isFranqueadora`).

**Botões do cabeçalho**: **"📊 Relatório do Mês"** (KPIs, gráfico 6 meses, "Saúde do Negócio" gauge 0-100, projeções — só leitura/simulação); status **"✓ PIX/Boleto configurado"**/**"⚠️ Configurar PIX/Boleto"** (modal "⚙️ Configuração de Pagamento": Chave PIX, Link do Boleto, Instruções; FRANQUEADORA tem campos extras: QR Code PIX e mensagem padrão de cobrança aos franqueados); **"🔄 Verificar Todos os Boletos"** (só FRANQUEADORA, dispara `GET /api/cron/verificar-boletos-cora` manualmente); **"+ Novo Lançamento"** (Descrição, Tipo Entrada/Saída, Valor, Categoria, Status, Vencimento, recorrência).

**KPIs**: ↑ Entradas, ↓ Saídas Pagas, 📋 Contas a Pagar (mês), ⏳ A Receber (mês), 💵 Caixa.

**Filtros**: `Mês Atual`, `Pendentes`, `Pagos`, `⚠️ Atrasados`, `📅 Futuros`, `Cancelados` ("Mês Atual" exclui atrasados/futuros de propósito).

**Ações por linha**: **"✓ Baixa"**, **"📧 Cobrar"**, **"🏦 Boleto Cora"** (só entradas categoria Franquia, só FRANQUEADORA), **"🔍 Verificar Pag."**, **"↩"** reverter, **"✏️"**, **"🗑"**.

**Bloco "🏛️ Taxa de Desenvolvimento de Rede"** (só FRANQUEADO): fórmula **"R$ 200,00 (sistema) + R$ 13,00 × estagiários ativos"**.

**Bloco "🏢 Cobrança de Franquias"** (só FRANQUEADORA): **"🏦 Gerar Cobrança + Boleto"** (avulsa, `POST /api/app/financeiro/gerar-cobranca-cora`); **"📅 Fechar Mês"** (habilita só a partir do dia 23; link secundário "Forçar agora (admin)" com `force=true`; `POST /api/app/financeiro/fechar-mes`).

**O que "Fechar Mês" faz** (`lib/financeiro/fechar-mes.ts`): gera para cada franquia ATIVA um `Financial` categoria "Franquia" = mensalidade (padrão R$200, zerável por franquia) + R$13/contrato ATIVO. Competência é sempre o **mês seguinte**. Deduplicação por franquia+competência. Vencimento no dia configurado (`diaVencimentoTaxa`, default 10, clamp 1-28). **Distinto** do "Mês Atual" operacional (seção 7.3).

**Modal "🚨 Unidades com 30+ dias de atraso"**: nota "Bloqueio automático: modo detecção (não bloqueia sozinho)" — o bloqueio real só ocorre se `BLOQUEIO_INADIMPLENCIA_ATIVO="true"`; por padrão só detecta e notifica a franqueadora.

Acesso à tela: FRANQUEADORA, FRANQUEADO, FUNCIONARIO, EQUIPE. Ações de cobrança de franquias são exclusivas de FRANQUEADORA.

### 7.2 Assinaturas (`/dashboard/assinaturas`)

**Atenção — não é sobre planos pagos.** É o painel de status de **assinatura digital de documentos** (Autentique) dos contratos. KPIs clicáveis: "Aguardando Assinatura", "Assinados", "Gerados (aguardando envio)". Filtros: Todos, Aguardando Assinatura, Assinados, Gerados, Enviados. Cada linha: **"Abrir →"** leva ao documento. Endpoint `GET /api/app/assinaturas` (exige sessão; filtro por franquia não confirmado em detalhe).

### 7.3 Contratos

**Lista** (`/dashboard/contratos`): **"+ Novo Estágio"**. Filtros: `✅ Ativos`, `⏳ Pendentes`, `✍️ Aguard. Assinatura`, `⚠️ Vencidos`, `✓ Finalizados`, `🔴 Inativos`. Cada linha: **"📄 Docs"**.

**Criar Novo Estágio** (`/dashboard/contratos/novo`, 3 etapas: "1. Partes", "2. Estágio", "3. Supervisor & Seguro"):
- Partes: Estagiário(a) \* (autocomplete), checkbox "menor de idade" + Nome do Responsável Legal \* se marcado, Empresa Concedente \* (autocomplete), Instituição de Ensino (autocomplete opcional), Tipo de Estágio (Não Obrigatório/Obrigatório). Nota: "O número do contrato é gerado automaticamente".
- Estágio: Bolsa \*, Valor cobrado Empresa, Auxílio Transporte, Benefícios, Data Início \*/Fim \*, Modalidade, Dias da Semana (presets ou Personalizado com blocos de horário), Horário/Intervalo. Validações em tempo real (Lei 11.788, art. 10): C.H. diária >6h ou semanal >30h bloqueia avanço. Vencimento (dia do mês), Cidade, Atividades \* (com botão de IA "Gerar atividades conforme Lei 11.788/08"), Local. Aviso se prazo >2 anos (exceção PcD, art. 11).
- Supervisor & Seguro: Supervisor da Empresa \*, Cargo, E-mail, Telefone; Coordenador da Instituição (opcional); Apólice de Seguro \* (default `212709/M-65358303000126`), Seguradora (default "PORTO SEGURO S.A"). Nota: texto da tela diz "11 documentos", mas na prática são **9 slots automáticos** (ver seção 6.1).
- **"Criar Contrato ✓"** → `createContract()` → redireciona para `/dashboard/contratos`.

**Detalhe do Contrato** (`/dashboard/contratos/[id]`): **"✏️ Editar Estágio"**, **"🗑️ Excluir"** (irreversível, apaga contrato+documentos+avaliações+financeiro). Bloco "⬇ Downloads Rápidos" e "📄 Documentos do Estágio" (ver seção 6). Bloco "📋 Avaliação Semestral": **"📧 Enviar Avaliação por E-mail"**, link **"🔗 Abrir Formulário Diretamente"**. Bloco "📎 Documentos Físicos / Ativar Estágio" (ver seção 6.2). Modal **"🧮 Calculadora de Rescisão"**: "Último dia de estágio \*", Motivo, Descontos → **"🧮 Calcular e Gerar Recibo"**.

Relevante para: usuários com permissão "contratos".

### 7.4 "Mês Atual" (`/dashboard/mes`, `/mes/abrir`, `/mes/fechar`)

**Diferente do "Fechar Mês" financeiro (7.1).** Ferramenta operacional de metas mensais, exclusiva de quem tem `franchiseId` e role **diferente de FRANQUEADORA/EQUIPE** (`if (!franchiseId || role === "FRANQUEADORA" || role === "EQUIPE") redirect("/dashboard")`).

1. **Abrir o Mês** (`/dashboard/mes/abrir`, obrigatório antes do dia 5): Meta de empresas, leads, contratos, vagas, estudantes + "Contas a pagar do mês" (apenas informativo — não confirmado que gere lançamentos em `Financial`) + Observações → **"Confirmar Abertura do Mês"**.
2. Durante o mês: `/dashboard/mes` mostra progresso vs. metas.
3. **Fechar o Mês** (`/dashboard/mes/fechar`), 3 passos: (1) Resumo → "Avançar para Reconciliação Financeira →"; (2) Financeiro — marcar cada lançamento pendente/vencido como "✓ Recebido/Pago" ou "→ Manter em Atraso" → "Confirmar e Ver Relatório →"; (3) Relatório — indicadores reais vs. metas, mensagens de coaching, **"Baixar Relatório em PDF"**, e só depois de rolar até o fim, **"Confirmar Leitura e Fechar Mês"**.

Relevante para: exclusivamente FRANQUEADO/FUNCIONARIO de uma unidade.

### 7.5 Portal da Empresa — Financeiro (`/portal-empresa/financeiro`)

100% leitura. KPIs: Total Pago, A Pagar, Cobranças Vencidas. Alerta se houver vencidas. Bloco "💳 Dados para pagamento" (PIX copiável, "📄 Visualizar Boleto →", Instruções) se configurado pelo franqueado. A empresa não tem ação de pagamento dentro do sistema — paga por fora.

### 7.6 Automações (cron — não são cliques do usuário)

- `/api/cron/fechar-mes` — dia 23, 08h BRT: gera cobranças "Franquia" do mês seguinte.
- `/api/cron/emitir-boletos` — dia 2, 08h BRT: gera boleto+PIX Cora e envia por e-mail.
- `/api/cron/verificar-boletos-cora` — diário, 07h BRT: dá baixa nos boletos pagos.
- `/api/cron/lembretes-atraso` — diário, 08h BRT: marca vencidos, envia lembretes a cada 5 dias de atraso, roda detecção de inadimplência 30+ dias (bloqueio só se `BLOQUEIO_INADIMPLENCIA_ATIVO=true`).

### 7.7 Schema Prisma relevante (Financeiro/Documentos)

- **`model Contract`** (`contracts`): `numero`, `studentId`, `companyId`, `institutionId`, `franchiseId`, `bolsa`, `valorEmpresa`, `auxTransporte`, `beneficios`, `vencimento`, `dataInicio`/`dataFim`, `atividades`, `localEstagio`, `cidade`/`uf`, `chDiaria`, `chSemanal`, `diasSemana`, `horarioInicio`/`horarioFim`, `intervalo`, dados supervisor/coordenador, `apoliceSeguro`, `seguradora`, `tipoEstagio`, `modalidade`, `status` (enum), `origem` (NORMAL/MIGRADO), `ativadoEm`, `migradoEm`/`migradoPor`/`tceMigradaUrl`.
- **`enum ContractStatus`**: `PENDENTE, AGUARDANDO_ASSINATURA, ATIVO, VENCIDO, FINALIZADO, SUSPENSO, INATIVO`.
- **`model InternshipDocument`** (`internship_documents`): `contractId`, `tipo` (string livre), `titulo`, `status` (enum `DocStatus`), `htmlContent`, `pdfUrl`, `signedUrl`, `signedAt`, `signers` (Json), `authDocId`, `metaData` (Json).
- **`enum DocStatus`**: `NAO_GERADO, RASCUNHO, GERADO, ENVIADO_ASSINATURA, AGUARDANDO_ASSINATURA, ASSINADO, CANCELADO`.
- **`model Financial`** (`financials`): `descricao`, `tipo` (entrada/saida), `valor`, `categoria` (livre: Empresa/Franqueado/Taxa/Taxa Admin/Franquia/Operacional/Seguro/Outro), `status` (enum), `vencimentoAt`, `paidAt`, `cancelado`, `franchiseId`, `companyId`, `contractId`, `recorrente`, `diaVencimento`, `competencia` ("YYYY-MM"), `linkPagamento`, `chavePix`, `instrucaoPagamento`, `coraInvoiceId`.
- **`enum FinancialStatus`**: `PENDENTE, PAGO, VENCIDO, CANCELADO`.
- Não existe model "Assinatura" nem "Boleto" separados (campos dentro de `InternshipDocument`/`Financial`). Não existe model "Mensalidade" (é um `Financial` categoria "Franquia").
- **`MonthOpening`/`MonthClosing`**: estrutura do fluxo "Mês Atual" (metas, números reais, score, `contasConfirmadas`, `leituraConfirmada`) — totalmente separado da cobrança de franquias.
- **`Franchise`** (billing): `mensalidade`, `cobrarMensalidade`, `diaVencimentoTaxa`, `acessoBloqueado`, `bloqueadoEm`, `bloqueioMotivo`, `bloqueioLiberadoAte`.
- **Configuração de pagamento**: sem model dedicado — usa `SystemConfig` (chavePix, linkPagamento, instrucaoPagamento, qrCodePixUrl, mensagemCobrancaFranqueado da franqueadora) + campos próprios em cada `Franchise`.

### 7.8 Resumo de acesso por role (Marketing/Financeiro/Documentos)

| Área | FRANQUEADORA | FRANQUEADO | FUNCIONARIO | EQUIPE | EMPRESA | ESTUDANTE |
|---|---|---|---|---|---|---|
| Marketing Hub (leitura) | ✅ | ✅ | ✅ | ✅ | não confirmado | não confirmado |
| Marketing Admin (escrita) | ✅ | ❌ | ❌ | ✅ só com permissão "marketing" | ❌ | ❌ |
| Tráfego Pago (leitura) | ✅ rede | ✅ própria unidade | não confirmado | via checkPermission | ❌ | ❌ |
| Tráfego Pago (escrita) | ❌ — só via API externa de parceiros | | | | | |
| Financeiro (tela geral) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fechar Mês (cobrança de franquias) | ✅ exclusivo | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerar Cobrança + Boleto Cora avulso | ✅ exclusivo | ❌ | ❌ | ❌ | ❌ | ❌ |
| "Mês Atual" (operacional) | ❌ redireciona | ✅ | ✅ | ❌ redireciona | ❌ | ❌ |
| Contratos (CRUD + documentos) | ✅ todos | ✅ própria unidade | ✅ própria unidade (permissão) | não explorado a fundo | ❌ | ❌ |
| Portal Empresa — Financeiro | — | — | — | — | ✅ leitura | — |

---

## 8. CONFIGURAÇÕES DA UNIDADE/FRANQUIA E DEMAIS ABAS

### 8.1 Configurações (`/dashboard/configuracoes`)

Visível para FRANQUEADORA e, para FUNCIONARIO/EQUIPE, quando a permissão `configuracoes` está marcada. **Somente `role === "FRANQUEADORA"` pode editar e salvar** — para os demais, campos somente-leitura e sem botões de salvar; subtítulo exato: **"Somente a Franqueadora pode editar estas configurações."**

8 abas exatas: **"Dados da Smarter"**, **"Branding"**, **"Login Visual"**, **"Documentos"**, **"Certidões IES"**, **"Email (Resend)"**, **"Assinatura Digital"**, **"Seguro"**.

- **Dados da Smarter**: Razão Social, CNPJ, Chave PIX, Endereço, Cidade, UF, Telefone, E-mail, Responsável Legal → **"Salvar Configurações"**.
- **Branding**: Nome do Sistema, Slogan → **"Salvar Branding"**.
- **Login Visual**: Título, Subtítulo, Slogan, URL da Logo, URL da Imagem de Fundo → **"Salvar Visual do Login"**.
- **Documentos**: URL da Logo para Documentos, Texto/Imagem de Marca d'Água; card "Assinatura e Carimbo" (Nome do Responsável, Cargo, upload de imagem via **"📤 Selecionar imagem"**) → **"Salvar Config. Documentos"**.
- **Certidões IES**: aqui é onde se cadastram os documentos que a IES vê no portal dela (seção 1.6). Nome, Tipo, Descrição, Data de validade, upload/URL → **"＋ Adicionar Documento"** (`POST /api/admin/ies-documentos`). Badges de vigência (🔴≤15d, 🟡≤30d, ✅ válido, ⚠️ vencido). Excluir: **"Remover"**.
- **Email (Resend)**: API Key do Resend (campo mascarado) → **"Salvar Configuração de Email"**.
- **Assinatura Digital**: Token de API (Autentique) → **"Salvar Token de Assinatura"**.
- **Seguro**: Nº da Apólice, Seguradora → texto: "✅ Esta apólice será preenchida automaticamente em todos os documentos TCE gerados." → **"Salvar"**.

`app/api/app/config-pagamento/`: API separada (sem aba própria aqui — usada dentro da tela Financeiro, seção 7.1). FRANQUEADORA edita `chavePix`/`linkPagamento`/`instrucaoPagamento`/`qrCodePixUrl`/`mensagemCobrancaFranqueado` (em `SystemConfig`, para cobrar franqueados); FRANQUEADO edita os mesmos campos do próprio `Franchise` (para cobrar suas empresas).

### 8.2 Equipe (`/dashboard/equipe`)

Visível para FRANQUEADORA e FRANQUEADO (não aparece no menu de FUNCIONARIO/EQUIPE — não há chave "equipe" no `PERM_NAV_MAP`).

Só FRANQUEADORA vê duas abas de alternância: **"👥 Colaboradores das Unidades"** (Employee com `franchiseId`, role FUNCIONARIO) e **"⭐ Equipe Smarter"** (role EQUIPE, `franchiseId = null`, acesso à rede toda — aviso: "As permissões selecionadas determinam quais módulos cada pessoa pode acessar."). FRANQUEADO só gerencia colaboradores da própria unidade.

Cadastrar colaborador: **"+ Novo Colaborador"** (ou "+ Novo Membro" na aba Equipe Smarter) → modal com Nome completo \*, E-mail \*, Cargo, Senha \* (mín. 6), Confirmar Senha \*, e checkboxes de **"Módulos com acesso"** (Financeiro, Contratos, Estudantes, Empresas, Vagas, Processos Seletivos, CRM, Instituições, Configurações; para Equipe Smarter também: Saúde do Sistema, Seguros, Gamificação, Franqueados, Engajamento, Marketing Hub Admin) → **"Criar Colaborador"** → `POST /api/app/equipe` (cria User + Employee com `permissoes` marcadas — essas chaves alimentam diretamente o `PERM_NAV_MAP` do Sidebar).

Ações na tabela: **"✏️ Editar"**, **"🔑 Senha"**, **"⛔"/"✅"** (bloquear/reativar), **"🗑️"** (excluir, aviso "não pode ser desfeita").

**Relatório de Equipe** (`/dashboard/equipe/relatorio`, botão **"📊 Relatório Diário"**, só FRANQUEADORA): atividade diária dos membros da Equipe Smarter — 1º acesso, última atividade, tempo "Online", ações do dia (login, cadastros, lançamentos financeiros, etc.). Rodapé: "Online: tempo entre o primeiro e o último evento do dia. Ações: criações/edições/exclusões — leituras não contam."

### 8.3 Gamificação (`/dashboard/gamificacao`)

Visível para FRANQUEADORA, FRANQUEADO, FUNCIONARIO/EQUIPE com permissão `gamificacao`.

Ações pontuáveis: 🔐 Login diário (10pts), 💼 Vaga publicada (50), 🏢 Empresa cadastrada (300), 📄 Contrato criado (100), 🏆 Lead convertido (200), ✍️ Documento assinado (75), 📞 Follow-up CRM (25), 🎓 Estudante aprovado (150) — valores padrão, editáveis só por FRANQUEADORA.

UI: card "Sua Pontuação"/"Total da Rede"; card "Pontuação por Ação"; "🏆 Ranking de Todas as Unidades" (franqueadora) ou "Sua Posição no Ranking" (demais); card "Histórico de Pontos". Editar pontuação: clicar na linha → modal **"Editar Pontuação"** → **"Salvar"**.

### 8.4 Engajamento (`/dashboard/engajamento`)

**Exclusiva de FRANQUEADORA** (`redirect` hard-coded — mesmo que um EQUIPE tenha a permissão "engajamento" marcada, é redirecionado; não confirmado se é inconsistência intencional).

Duas abas: **"Score de Atividade"** (score % por franqueado, últimos 7 dias/mês, alertas "⚠️ Sem contratos ativos" etc., "Ver detalhes →") e **"Abertura / Fechamento de Mês"** (tabela por unidade e mês, ✓/✗ de abertura/fechamento, link "⬇ Baixar relatório da rede em PDF", "Ver relatório →" com coaching por indicador).

### 8.5 Saúde do Sistema (`/dashboard/saude`)

Acesso: FRANQUEADORA ou EQUIPE com permissão `"saude"`. Subtítulo: "Monitoramento em tempo real · FRANQUEADORA".

Monitora: Score de Saúde (0-100), Alertas Ativos, Banco de Dados (Supabase: latência, totais), Deploy (Vercel, requer `VERCEL_TOKEN`), Email (Resend, requer `RESEND_API_KEY`), Inteligência Artificial (OpenAI — custo real "não confirmado", coluna não existe no DB atual segundo comentário), Resumo Operacional. Botões: **"Auto-refresh"** (60s) e **"Atualizar"**.

### 8.6 Seguros (`/dashboard/seguros`)

**Exclusiva de FRANQUEADORA**. Subtítulo: "Apólice {apolice} • {seguradora} • Apenas Franqueadora" — **atenção: apólice/seguradora aqui estão hardcoded no código** (`212709/M-65358303000126`, "PORTO SEGURO S.A"), não confirmado se sincroniza com os valores editáveis em Configurações → aba "Seguro".

Lista mensal navegável: **"✅ Incluir no Seguro"** (contratos ATIVO cobrindo o mês) e **"❌ Excluir do Seguro"** (contratos finalizados/inativos/suspensos atualizados no mês). Botão **"⬇ Excel"** em cada lista (CSV nomeado `seguro-{incluir|excluir}-{mes}-{ano}.csv`). Não há cadastro de apólices aqui — é operacional mensal.

### 8.7 Rotas do menu — nenhuma órfã

Todas as rotas de `app/dashboard/` que não estão no Sidebar estão linkadas de outro lugar: `/dashboard/ies*` (de dentro de Instituições), `/dashboard/solicitacao/[id]` (do painel principal, ver 8.8), `/dashboard/mes*` (no Sidebar como "Mês Atual"), `/dashboard/franquia-crm*` (no Sidebar como "CRM Franquias 🏢").

### 8.8 Notificações / Alertas

**Não existe sino no cabeçalho** (busca por `Bell` no código não retornou nada). Em vez disso, dois painéis na home do dashboard:

**a) "🔔 Lembretes e Alertas"** (`AlertasPanel.tsx`, para todos os papéis internos): três níveis — **Crítico** ("Contratos pendentes há +60 dias", "Contratos vencidos não finalizados", e só franqueadora: "Unidades com contratos pendentes +60 dias", "Tarefas vencidas no CRM Franquias"); **Atenção** ("Contratos vencendo em até 30 dias", "Contratos pendentes há 30–60 dias", "Avaliação semestral devida", "CRM — Leads com retorno vencido"); **Info** (só franqueadora: "CRM Franquias — Leads sem contato há +7 dias"). Se vazio: "✅ Tudo em dia! Nenhum alerta pendente."

**b) "🎯 Solicitações de Estagiário"** (só FRANQUEADO/FUNCIONARIO): notificações não lidas do tipo `SOLICITACAO_ESTAGIARIO` (ver Fluxo B da seção 3.6). Botões **"Abrir"** (→ `/dashboard/solicitacao/{id}`, marca como lida) e **"Baixar PDF"**.

**Não confirmado**: se existem outros `tipo`s de `Notification` além de `SOLICITACAO_ESTAGIARIO` visíveis na UI.

### 8.9 Bloqueio por inadimplência (`/bloqueado`)

Redirecionamento acontece em `app/dashboard/layout.tsx`: role FRANQUEADO/FUNCIONARIO com `Franchise.acessoBloqueado === true` (e sem tolerância vigente em `bloqueioLiberadoAte`) → `/bloqueado`.

Motivo: inadimplência na Taxa de Desenvolvimento de Rede (30+ dias de atraso). Texto exato: *"O acesso da sua unidade ao Sistema Smarter foi suspenso por pendência financeira na Taxa de Desenvolvimento de Rede. Assim que o pagamento for confirmado — ou a liberação for concedida pela Franqueadora — o acesso é restabelecido automaticamente."*

**Importante**: o bloqueio automático por cron só roda se `BLOQUEIO_INADIMPLENCIA_ATIVO="true"` — por padrão (comentário no código: "produção hoje: desligada") o sistema só detecta e notifica, não bloqueia sozinho. Existe válvula de escape (`bloqueioLiberadoAte`, tolerância temporária). **Não localizado** o botão de bloqueio manual (mencionado em comentário, possivelmente em `/dashboard/franqueados/[id]`, fora do escopo desta investigação).

Tela `/bloqueado`: "🔒 Acesso temporariamente suspenso", lista cobranças em aberto com "📄 Pagar boleto"/PIX, contato financeiro@smarterestagios.com.br, links "Verificar novamente" e "Sair". FRANQUEADORA nunca é bloqueada; EMPRESA/ESTUDANTE são redirecionados para seus próprios portais.

### 8.10 `app/api/app/sessao/ping`

Chamado a cada 5 minutos pelo frontend (`components/MesGate.tsx`, `PING_INTERVAL_MS`) enquanto o usuário tem o sistema aberto — só para role FRANQUEADO/FUNCIONARIO. Fecha a sessão de rastreamento atual (`UserSessionLog`) e abre uma nova, mantendo o relógio de "horas ativas" rodando. Alimenta os indicadores de "Horas no sistema" da tela de Engajamento e do fechamento de mês.

### Observações finais / pontos "não confirmados" (Configurações e demais abas)
- Não confirmado se apólice/seguradora de `/dashboard/seguros` (hardcoded) sincroniza com os campos editáveis em Configurações → "Seguro".
- Não localizado o botão de bloqueio manual de franquia por inadimplência.
- Não está claro se "Engajamento" fica de fato acessível para EQUIPE com a permissão marcada, já que a página tem `redirect` hard-coded para qualquer role diferente de FRANQUEADORA.
- Sem evidência de outros tipos de `Notification` além de `SOLICITACAO_ESTAGIARIO` visíveis na UI.

---

## RESUMO RÁPIDO DE ACESSO POR PAPEL (visão geral, para calibrar a resposta da Lia)

| Área | Franqueadora | Franqueado | Funcionário/Equipe | Empresa | Estudante |
|---|---|---|---|---|---|
| Instituições (cadastro) | total | total | com permissão `instituicoes` | não | não |
| Convênio IES (`/dashboard/ies`) | total | total | Funcionário sim, Equipe **não** | não | não |
| CRM (parcerias) | total (rede) | total (própria unidade) | com permissão `crm` | não | não |
| CRM Franquias | exclusivo | não | não | não | não |
| Vagas/Processos | total | total (própria unidade) | com permissão | solicita, não cria | candidata-se |
| Financeiro | total | total | com permissão | só leitura (portal) | não |
| Marketing Admin | total | não (só leitura) | Equipe com permissão | não | não |
| Configurações (editar) | exclusivo | só leitura | só leitura | não | não |
| Equipe/Gamificação/Seguros/Saúde/Engajamento | painéis quase todos exclusivos ou com permissão específica | limitado/nenhum acesso a Engajamento/Seguros/Saúde | conforme permissão | não | não |

---

## PONTOS QUE A LIA DEVE TRATAR COM "NÃO TENHO CERTEZA" EM VEZ DE INVENTAR

1. Se existe notificação automática (e-mail/SMS) ao agendar entrevista de processo seletivo — não encontrado no código.
2. Se o bloqueio automático por inadimplência está ativo em produção agora — depende de variável de ambiente, não é fixo no código.
3. Se os valores de apólice/seguradora da tela "Seguros" batem com os salvos em Configurações → "Seguro" — não confirmado.
4. Onde fica o botão de bloqueio manual de franquia por inadimplência — mencionado em comentário de código mas não localizado na tela.
5. Qualquer pergunta sobre `/dashboard/ies` versus `/dashboard/instituicoes` deve deixar claro que são **duas telas diferentes**, e que o link de convênio não está no menu principal.
6. Uso do fluxo de convite de IES para uma instituição já cadastrada pode duplicar o registro (achado crítico, seção 1) — vale alertar o usuário em vez de garantir que "vai funcionar direto".
7. Se há automação de e-mail/WhatsApp por mudança de etapa no CRM Franquias — não confirmado (no CRM principal existe; no CRM Franquias os envios são manuais).
8. Prompt exato usado por `/api/app/ai/disc-perfil` — não detalhado nesta investigação.
9. Tela exata (se existir) que chama `POST /api/app/processos/candidatar` no dashboard interno — não localizada.
