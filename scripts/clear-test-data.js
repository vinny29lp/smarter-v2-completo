/**
 * SCRIPT: Limpar todos os dados de teste do Supabase
 *
 * OPÇÃO 1 — Via API (mais fácil, basta estar logado como FRANQUEADORA):
 *   Abra o navegador em https://smarter-v2-completo.vercel.app/login
 *   Faça login como admin@smarter.com.br / smarter123
 *   Depois abra o console do navegador e execute:
 *
 *   fetch('/api/app/admin/reset-data', { method: 'POST' })
 *     .then(r => r.json()).then(console.log)
 *
 * OPÇÃO 2 — Executar este script localmente:
 *   1. Certifique-se de ter o Node.js e o pacote @prisma/client instalados
 *   2. No terminal, a partir da pasta do projeto, rode:
 *      DATABASE_URL="..." node scripts/clear-test-data.js
 *
 * OPÇÃO 3 — Via Supabase SQL Editor (dashboard.supabase.com):
 *   Cole e execute o conteúdo de scripts/clear-test-data.sql
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Iniciando limpeza dos dados de teste...\n");

  const results = {};

  async function del(key, fn) {
    try {
      const r = await fn();
      results[key] = r.count ?? "ok";
      console.log(`  ✅ ${key}: ${results[key]} registros deletados`);
    } catch (e) {
      results[key] = `ERRO: ${e.message?.substring(0, 80)}`;
      console.log(`  ⚠️  ${key}: ${results[key]}`);
    }
  }

  // Deletar em ordem de dependência (filhos primeiro)
  await del("activityLog",       () => prisma.activityLog.deleteMany({}));
  await del("crmTask",           () => prisma.crmTask?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("crmNota",           () => prisma.crmNota?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("crmLead",           () => prisma.crmLead?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("docAssinatura",     () => prisma.documentoAssinatura?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contratoAssinatura",() => prisma.contratoAssinatura?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("application",       () => prisma.application?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contratoItem",      () => prisma.contratoItem?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("processoSeletivo",  () => prisma.processoSeletivo?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contrato",          () => prisma.contrato?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("financial",         () => prisma.financial?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("lead",              () => prisma.lead?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("vaga",              () => prisma.vacancy?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("employee",          () => prisma.employee.deleteMany({}));
  await del("student",           () => prisma.student.deleteMany({}));
  await del("company",           () => prisma.company.deleteMany({}));
  await del("institution",       () => prisma.institution.deleteMany({}));
  await del("franchise",         () => prisma.franchise.deleteMany({}));
  await del("user (não-FRANQUEADORA)", () =>
    prisma.user.deleteMany({ where: { role: { not: "FRANQUEADORA" } } })
  );

  console.log("\n✅ Limpeza concluída!\n");
  console.log("Resumo:", results);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
