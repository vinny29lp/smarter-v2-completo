-- Lia lê e responde e-mails: unidade dona de cada envio (para encaminhar respostas à unidade certa). Aditiva.
ALTER TABLE automacao_envios ADD COLUMN IF NOT EXISTS "franchiseId" TEXT;
CREATE INDEX IF NOT EXISTS automacao_envios_destinatario_idx ON automacao_envios (destinatario, tipo, "createdAt");
