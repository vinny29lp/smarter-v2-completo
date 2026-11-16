# Pergunta para a Alizo — respostas de e-mail da prospecção (Sales Rep)

Olá, time Alizo!

Na integração da Smarter Estágios, o webhook assinado já recebe `lead.message.sent` e `lead.message.received` (WhatsApp), e usamos esses eventos para avisar a unidade dona do lead.

Quando o Sales Rep prospecta **por e-mail**, precisamos saber:

1. Se o lead responde ao e-mail, isso gera `lead.message.received`? O payload traz o canal (e-mail/WhatsApp) e o texto da resposta? Se não, existe outro evento ou endpoint (ex.: listar mensagens do lead) para consultarmos?
2. Qual é o endereço de Reply-To usado nos e-mails do Sales Rep? É possível configurá-lo para um endereço nosso (ex.: respostas@<nosso domínio>), para recebermos a resposta direto?
3. Há evento para "lead respondeu" independente do canal (ex.: `lead.replied`) e para mudança de status do lead?

Motivo: a resposta precisa chegar à unidade franqueada dona do lead; sem isso o lead se perde.

Obrigado!
