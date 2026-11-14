# Lia lê e responde e-mails — como ativar

Tudo no código já está pronto e **desligado por padrão**. Enquanto as variáveis abaixo não existirem, os e-mails da Lia
saem normalmente (com a identidade visual da Smarter) e as respostas continuam caindo na caixa `contato@`.

## Como funciona
1. Cada e-mail da Lia sai com um **Reply-To rastreável**: `lia+<id-do-envio>@<domínio de recebimento>`.
2. Quando a pessoa responde, a Resend recebe e avisa o sistema (`email.received`, assinado).
3. O sistema identifica o envio original (tipo, unidade, contrato/lead/vaga) pelo `<id>` do endereço.
4. **Sempre** avisa a unidade pelo sino ("📩 Resposta a um e-mail da Lia") e, se for lead do CRM, grava a resposta na linha do tempo.
5. Se a resposta automática estiver ligada, a Lia responde na mesma conversa, com os **links certos para o assunto**;
   se for assunto sensível ou ela não souber, **encaminha à unidade** e avisa a pessoa.

## Travas de segurança
- Só responde a quem recebeu o e-mail original da Lia (remetente = destinatário do envio).
- Nunca responde auto-respostas (férias, bounce, no-reply) → sem loop.
- No máximo 3 respostas automáticas por pessoa por semana.
- Assuntos sensíveis (jurídico, cancelamento de contrato, cobrança/pagamento, reclamação, LGPD…) vão **sempre** à unidade.
- Pedido de descadastro ("pare", "não quero receber"…) é atendido na hora e entra em `contatos_optout`.
- A IA só responde o que está na base de conhecimento do sistema; sem valores, prazos ou promessas.

## Passo a passo (uma vez só)
1. **Resend → Emails → Receiving**: habilitar o recebimento.
   - Rápido: usar o subdomínio `<id>.resend.app` da própria Resend (funciona na hora, sem DNS).
   - Definitivo: criar um **subdomínio** exclusivo (ex.: `respostas.smarterestagios.com.br`) com o registro MX indicado pela Resend.
     **Não** colocar MX no domínio raiz — isso desviaria os e-mails normais da empresa.
2. **Resend → Webhooks → Add**: evento `email.received`, URL
   `https://sistema.smarterestagios.com.br/api/webhooks/resend-inbound`. Copiar o **Signing Secret** (`whsec_...`).
3. **Vercel → Environment Variables (Production)**:
   - `LIA_EMAIL_RESPOSTAS` = `lia@<domínio de recebimento>` (ex.: `lia@respostas.smarterestagios.com.br`)
   - `RESEND_INBOUND_WEBHOOK_SECRET` = o `whsec_...` do passo 2
   - Redeploy.
4. **Testar**: responder a um e-mail da Lia → confirmar o aviso no sino da unidade.
5. **Ligar a resposta automática**: `LIA_RESPOSTA_EMAIL_ATIVA` = `true` (e redeploy). Para desligar, remover a variável.

Observação: e-mails já enviados antes do passo 3 não têm Reply-To rastreável; as respostas a eles continuam indo para `contato@`.
