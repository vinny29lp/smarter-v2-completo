# Pedido à Alizo — criação automática de unidades e conexão de WhatsApp pelo Sistema Smarter

**Objetivo:** quando uma franquia for criada no Sistema Smarter, a unidade correspondente deve nascer na Alizo
**já configurada e treinada com o padrão da rede** (Sales Rep, Prospecção Google Maps e Recrutador/RH), e cada
unidade deve conectar o próprio WhatsApp **pelo painel da Smarter** (QR Code), sem ninguém mexer no painel da Alizo.

Mesma chave de parceiro (`Authorization: Bearer`, limite 120 req/min, erros `{ "error": "pt-BR" }`).
Escopos novos sugeridos: `units:write`, `whatsapp:manage`.

## 1. Criar unidade (idempotente)
`POST /api/partner/v1/units`
```json
{ "external_id": "id-da-franquia-na-smarter", "name": "Smarter Cuiabá", "city": "Cuiabá", "state": "MT",
  "timezone": "America/Cuiaba", "contact_email": "opcional@x.com" }
```
- `external_id` único por organização: repetir devolve `200 { duplicate:true, unit }` (nunca cria duas).
- A unidade deve ser criada **já com o template padrão da rede aplicado**: agente Sales Rep, Prospecção (Maps),
  Recrutador/RH, textos/treinamento, horário ativo e limites padrão — sem passo manual.
- Resposta `201 { unit: { id, slug, name, city, state, whatsapp_phone:null, timezone, external_id, template_version } }`.
- `PUT /units/{id}` para atualizar nome/cidade; `GET /units?external_id=` para localizar.

## 2. Conexão de WhatsApp (QR Code ou API oficial)
- `POST /units/{id}/whatsapp/connect` → inicia o pareamento. Resposta:
  `{ status: "qr_pending", qr_code: "<base64 PNG ou string>", expires_at, provider: "evolution|official" }`
  (na API oficial, devolver o fluxo equivalente — link/código de associação — com o mesmo envelope).
- `GET /units/{id}/whatsapp` → `{ status: "connected|qr_pending|disconnected|error", phone, provider, updated_at }`.
- `POST /units/{id}/whatsapp/disconnect` → desconecta.
- Webhooks novos: `unit.whatsapp.connected`, `unit.whatsapp.disconnected` (mesma assinatura HMAC já usada).

## 3. Padrão único da rede
- Um **template de organização** (treinamento do Sales Rep, Recrutador/RH, prospecção) editado em um só lugar.
- `GET /template` → `{ version, updated_at, agents:[...] }`; atualização do template propaga às unidades
  (ou `POST /units/{id}/template/sync`). Campo `template_version` na unidade para a Smarter auditar.
- Overrides por unidade só os explicitamente permitidos (ex.: região da prospecção, setores).

## 4. O que a Smarter fará quando isto existir
1. Ao criar a franquia: `POST /units` com `external_id` e gravar o mapeamento em `alizo_unidades` (hoje manual).
2. Rodar o mesmo para as franquias já existentes (backfill idempotente).
3. No painel da unidade, aba **Funcionários digitais**: botão "Conectar WhatsApp" (exibe o QR, acompanha o status
   por polling/webhook), indicadores e trabalhos executados.
4. Remover a etapa manual de mapeamento.

## Critérios de aceite
- Criar a mesma franquia 2x não duplica a unidade.
- Unidade nova responde ao teste padrão (lead pausado, mensagem, perfil de prospecção, vaga) sem configuração extra.
- QR gera, conecta, e o status muda para `connected` com o número em `GET /units`.
- Nenhuma rota expõe dados de outra organização.
