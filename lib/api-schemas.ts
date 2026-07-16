/**
 * api-schemas.ts — Schemas Zod para validação nas APIs
 * Sprint 02 — SEC-014 + SEC-015
 *
 * Validações de entrada para as rotas críticas do sistema.
 */

import { z } from "zod";

// ── Utilitários ───────────────────────────────────────────────────────────

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +d[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +d[10];
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (nums: number[], weights: number[]) =>
    nums.reduce((acc, n, i) => acc + n * weights[i], 0);
  const digits = d.split("").map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(digits.slice(0, 12), w1) % 11;
  if ((r1 < 2 ? 0 : 11 - r1) !== digits[12]) return false;
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r2 = calc(digits.slice(0, 13), w2) % 11;
  return (r2 < 2 ? 0 : 11 - r2) === digits[13];
}

// ── Tipos base ────────────────────────────────────────────────────────────

export const emailField = z.string().email("E-mail inválido.").max(255).optional().nullable().or(z.literal(""));
export const telField    = z.string().max(20).optional().nullable();
export const cepField    = z.string().max(10).optional().nullable();

// ── Schemas de API ────────────────────────────────────────────────────────

export const criarEmpresaSchema = z.object({
  name:             z.string().min(2, "Nome obrigatório.").max(200),
  razaoSocial:      z.string().max(200).optional().nullable().or(z.literal("")),
  cnpj:             z.string().min(11).max(20).refine(validarCNPJ, { message: "CNPJ inválido." }),
  email:            z.string().email("E-mail inválido.").max(255),
  cidade:           z.string().min(2, "Cidade obrigatória.").max(100),
  setor:            z.string().max(100).optional().nullable(),
  telefone:         telField,
  responsavel:      z.string().max(150).optional().nullable(),
  cargoResponsavel: z.string().max(100).optional().nullable(),
  endereco:         z.string().max(300).optional().nullable(),
  bairro:           z.string().max(100).optional().nullable(),
  uf:               z.string().max(2).optional().nullable(),
  cep:              cepField,
  site:             z.string().max(300).optional().nullable(),
  emailFinanceiro:  emailField,
  franchiseId:      z.string().optional().nullable(),
});

export const criarEstudanteSchema = z.object({
  nome:              z.string().min(2, "Nome obrigatório.").max(200),
  email:             z.string().email("E-mail inválido.").max(255),
  curso:             z.string().min(2, "Curso obrigatório.").max(200),
  cpf:               z.string().max(20).optional().nullable()
                       .refine((v) => !v || validarCPF(v), { message: "CPF inválido." }),
  celular:           telField,
  telefone:          telField,
  cep:               cepField,
  cidade:            z.string().max(100).optional().nullable(),
  uf:                z.string().max(2).optional().nullable(),
  observacoes:       z.string().max(2000).optional().nullable(),
  periodo:           z.string().max(50).optional().nullable(),
  previsaoConclusao: z.string().max(20).optional().nullable(),
  franchiseId:       z.string().optional().nullable(),
  institutionId:     z.string().optional().nullable(),
  senha:             z.string().max(100).optional().nullable(),
  dataNasc:          z.string().optional().nullable(),
  sexo:              z.string().max(20).optional().nullable(),
  rg:                z.string().max(30).optional().nullable(),
  endereco:          z.string().max(300).optional().nullable(),
  bairro:            z.string().max(100).optional().nullable(),
  semestre:          z.string().max(20).optional().nullable(),
  menorDeIdade:      z.boolean().optional().nullable(),
  nomeResponsavel:   z.string().max(200).optional().nullable(),
});

export const criarLancamentoSchema = z.object({
  descricao:     z.string().min(1, "Descrição obrigatória.").max(500),
  tipo:          z.string().min(1, "Tipo obrigatório."),
  valor:         z.union([z.number(), z.string()]).refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    { message: "Valor deve ser um número positivo." }
  ),
  categoria:     z.string().min(1, "Categoria obrigatória.").max(100),
  status:        z.string().optional(),
  recorrente:    z.boolean().optional(),
  diaVencimento: z.union([z.number(), z.string()]).optional().nullable(),
  vencimentoAt:  z.string().optional().nullable(),
  companyId:     z.string().optional().nullable(),
  contractId:    z.string().optional().nullable(),
});

export const criarLeadSchema = z.object({
  empresa:        z.string().min(1, "Nome da empresa obrigatório.").max(200),
  contato:        z.string().max(150).optional().nullable(),
  cargo:          z.string().max(100).optional().nullable(),
  email:          emailField,
  telefone:       telField,
  whatsapp:       telField,
  instagram:      z.string().max(100).optional().nullable(),
  linkedin:       z.string().max(300).optional().nullable(),
  cidade:         z.string().max(100).optional().nullable(),
  uf:             z.string().max(2).optional().nullable(),
  setor:          z.string().max(100).optional().nullable(),
  origem:         z.string().max(50).optional().nullable(),
  prioridade:     z.enum(["baixa", "media", "alta"]).optional().default("media"),
  valorNegociado: z.union([z.number(), z.string()]).optional().nullable()
                    .transform(v => (v !== null && v !== undefined && v !== "" ? parseFloat(String(v)) : null)),
  proximaAcao:    z.string().max(500).optional().nullable(),
  retornoAt:      z.string().optional().nullable(),
  observacao:     z.string().max(2000).optional().nullable(),
});

// ── Partners API — CRM (escrita escopada por franquia) ────────────────────

export const CRM_ETAPAS = ["novo_lead", "primeiro_contato", "apresentacao", "proposta", "negociacao", "fechado"] as const;
export const CRM_SITUACOES = ["ativo", "vendido", "perdido", "pausado"] as const;

export const partnerCriarLeadSchema = z.object({
  empresa:        z.string().min(1, "Nome da empresa obrigatório.").max(200),
  contato:        z.string().max(150).optional().nullable(),
  email:          emailField,
  telefone:       telField,
  whatsapp:       telField,
  cidade:         z.string().max(100).optional().nullable(),
  uf:             z.string().max(2).optional().nullable(),
  setor:          z.string().max(100).optional().nullable(),
  prioridade:     z.enum(["baixa", "media", "alta"]).optional().default("media"),
  anotacao:       z.string().max(2000).optional().nullable(),
});

export const partnerAtualizarLeadSchema = z.object({
  etapa:          z.enum(CRM_ETAPAS).optional(),
  situacao:       z.enum(CRM_SITUACOES).optional(),
  proximaAcao:    z.string().max(500).optional().nullable(),
  valorNegociado: z.union([z.number(), z.string()]).optional().nullable()
                    .transform(v => (v !== null && v !== undefined && v !== "" ? parseFloat(String(v)) : null)),
  anotacao:       z.string().max(2000).optional().nullable(),
});

// ── Helper de resposta de erro ────────────────────────────────────────────

export function zodError(error: z.ZodError): { error: string } {
  const messages = error.issues
    .map((e) => `${e.path.length ? e.path.join(".") + ": " : ""}${e.message}`)
    .join("; ");
  return { error: `Dados inválidos: ${messages}` };
}
