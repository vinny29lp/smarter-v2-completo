-- Adiciona o campo "remunerado" ao contrato — hoje não existe nenhuma forma
-- explícita de marcar um estágio como não remunerado; o texto da cláusula de
-- recesso e da cláusula de bolsa-auxílio nos documentos gerados sempre
-- assumia "remunerado", e franqueados recorriam a gambiarras (ex: digitar
-- bolsa = -1) pra sinalizar isso manualmente, gerando texto quebrado nos
-- documentos ("R$ -1,00 (menos um reais)").
ALTER TABLE contracts ADD COLUMN "remunerado" BOOLEAN NOT NULL DEFAULT true;
