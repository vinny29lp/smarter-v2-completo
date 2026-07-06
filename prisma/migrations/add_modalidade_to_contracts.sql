-- Adiciona campo modalidade ao model Contract
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS modalidade TEXT DEFAULT 'Presencial';
