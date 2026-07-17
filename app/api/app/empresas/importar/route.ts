import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkPermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

const MAX_BATCH_SIZE = 200;
const CONCURRENCY = 10;

interface CompanyRow {
  name: string;
  razaoSocial?: string;
  cnpj: string;
  setor?: string;
  email: string;
  telefone?: string;
  responsavel?: string;
  cargoResponsavel?: string;
  endereco?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
  site?: string;
}

type DetalheItem = {
  nome: string;
  status: "importado" | "duplicado" | "erro";
  motivo?: string;
};

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const body = await req.json();
  const { empresas, arquivo } = body as { empresas: CompanyRow[]; arquivo: string };

  if (!empresas || !Array.isArray(empresas) || empresas.length === 0) {
    return NextResponse.json({ error: "Nenhuma empresa para importar." }, { status: 400 });
  }

  if (empresas.length > MAX_BATCH_SIZE) {
    return NextResponse.json({
      error: `Máximo de ${MAX_BATCH_SIZE} empresas por importação. Divida o arquivo em lotes menores.`,
      total: empresas.length,
      limite: MAX_BATCH_SIZE,
    }, { status: 400 });
  }

  // Empresas migradas sempre ligadas ao Admin (franchiseId = null) e marcadas como
  // origem=MIGRADO — ficam visíveis para todas as unidades (ver GET /api/app/empresas).
  const franchiseId: undefined = undefined;
  const userId = (session.user as any).id || session.user.email || "";

  const linhasValidas: (CompanyRow & { name: string; email: string; cnpjLimpo: string })[] = [];
  const detalhes: DetalheItem[] = [];

  for (const row of empresas) {
    const name = (row.name || "").trim();
    const email = (row.email || "").trim().toLowerCase();
    const cnpjLimpo = (row.cnpj || "").replace(/\D/g, "");
    if (!name || !email || cnpjLimpo.length !== 14 || !row.cidade || !row.uf) {
      detalhes.push({ nome: name || "(sem nome)", status: "erro", motivo: "Nome, CNPJ, e-mail, cidade e UF são obrigatórios" });
      continue;
    }
    linhasValidas.push({ ...row, name, email, cnpjLimpo });
  }

  const cnpjsParaVerificar = linhasValidas.map(r => r.cnpjLimpo);
  const emailsParaVerificar = linhasValidas.map(r => r.email);

  const [companiesExistentes, usersExistentes] = await Promise.all([
    prisma.company.findMany({
      where: { cnpj: { in: cnpjsParaVerificar } },
      select: { cnpj: true },
    }),
    prisma.user.findMany({
      where: { email: { in: emailsParaVerificar } },
      select: { email: true },
    }),
  ]);

  const cnpjsDuplicados = new Set(companiesExistentes.map(c => c.cnpj));
  const emailsDuplicados = new Set(usersExistentes.map(u => u.email));

  const linhasParaCriar: (CompanyRow & { name: string; email: string; cnpjLimpo: string })[] = [];
  const cnpjsNesteLote = new Set<string>();
  const emailsNesteLote = new Set<string>();

  for (const row of linhasValidas) {
    if (cnpjsDuplicados.has(row.cnpjLimpo)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "CNPJ já cadastrado no sistema" });
      continue;
    }
    if (emailsDuplicados.has(row.email)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "E-mail já cadastrado no sistema" });
      continue;
    }
    if (cnpjsNesteLote.has(row.cnpjLimpo)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "CNPJ repetido no arquivo enviado" });
      continue;
    }
    if (emailsNesteLote.has(row.email)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "E-mail repetido no arquivo enviado" });
      continue;
    }
    cnpjsNesteLote.add(row.cnpjLimpo);
    emailsNesteLote.add(row.email);
    linhasParaCriar.push(row);
  }

  let importados = 0;

  for (let i = 0; i < linhasParaCriar.length; i += CONCURRENCY) {
    const batch = linhasParaCriar.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (row) => {
      try {
        const senhaPlain = require("crypto").randomBytes(6).toString("hex") + "S1!";
        const hash = await bcrypt.hash(senhaPlain, 10);

        await prisma.$transaction(async (tx) => {
          const company = await tx.company.create({
            data: {
              name: row.name,
              razaoSocial: row.razaoSocial || row.name,
              cnpj: row.cnpjLimpo,
              setor: row.setor || null,
              email: row.email,
              telefone: (row.telefone || "").replace(/\D/g, "").slice(0, 20) || null,
              responsavel: row.responsavel || null,
              cargoResponsavel: row.cargoResponsavel || null,
              endereco: row.endereco || null,
              bairro: row.bairro || null,
              cidade: row.cidade,
              uf: row.uf.toUpperCase().slice(0, 2),
              cep: row.cep || null,
              site: row.site || null,
              franchiseId: franchiseId || undefined,
              origem: "MIGRADO",
              migradoEm: new Date(),
              migradoPor: userId,
              migradoPorNome: session.user.name || session.user.email || "",
            },
          });

          await tx.user.create({
            data: {
              name: row.responsavel || row.name,
              email: row.email,
              password: hash,
              role: "EMPRESA",
              companyId: company.id,
              franchiseId: franchiseId || undefined,
              active: true,
            },
          });
        });

        importados++;
        detalhes.push({ nome: row.name, status: "importado" });
      } catch (e: any) {
        detalhes.push({ nome: row.name, status: "erro", motivo: e.message?.slice(0, 100) || "Erro desconhecido" });
      }
    }));
  }

  const duplicados = detalhes.filter(d => d.status === "duplicado").length;
  const erros = detalhes.filter(d => d.status === "erro").length;

  try {
    const detalhesParaSalvar = detalhes.filter(d => d.status !== "importado");
    await (prisma as any).importLog.create({
      data: {
        tipo: "EMPRESAS",
        franchiseId: franchiseId || null,
        userId,
        arquivo: arquivo || "importacao.xlsx",
        total: empresas.length,
        importados,
        duplicados,
        erros,
        detalhes: detalhesParaSalvar,
      },
    });
  } catch {}

  return NextResponse.json({ importados, duplicados, erros, detalhes });
  } catch (e) {
    return handleApiError(e, "EMPRESAS_IMPORTAR_POST");
  }
}
