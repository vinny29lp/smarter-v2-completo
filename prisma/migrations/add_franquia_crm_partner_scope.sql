-- Habilita tokens de parceiro de nível franqueadora (sem franchiseId), para o
-- novo scope "franquia_crm" — ponte entre o CRM de venda de franquias
-- (FranquiaLead) e sistemas parceiros (Alizo). FranquiaLead pertence à rede
-- como um todo, não a uma unidade específica (diferente de CrmLead, que é
-- sempre escopado por franquia) — por isso o token desse scope não amarra em
-- nenhuma linha de franchises.
-- Puramente relaxante: NOT NULL -> nullable, nenhuma coluna removida/renomeada.
ALTER TABLE "partner_api_tokens" ALTER COLUMN "franchiseId" DROP NOT NULL;
