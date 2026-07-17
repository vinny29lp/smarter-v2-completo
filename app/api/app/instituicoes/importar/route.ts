import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

const MAX_BATCH_SIZE = 200;
const CONCURRENCY = 10;

interface InstitutionRow {
  name: string;
  razaoSocial?: string;
  cnpj?: string;
  tipo?: string;
  email?: string;
  telefone?: string;
  coordenador?: string;
  cargoCoord?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  cep?: string;
  site?: string;
  cursos?: string;
}

type DetalheItem = {
  nome: string;
  status: "importado" | "duplicado" | "erro";
  motivo?: string;
};

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "instituicoes");
  if (permCheck) return permCheck;

  const body = await req.json();
  const { instituicoes, arquivo } = body as { instituicoes: InstitutionRow[]; arquivo: string };

  if (!instituicoes || !Array.isArray(instituicoes) || instituicoes.length === 0) {
    return NextResponse.json({ error: "Nenhuma instituição para importar." }, { status: 400 });
  }

  if (instituicoes.length > MAX_BATCH_SIZE) {
    return NextResponse.json({
      error: `Máximo de ${MAX_BATCH_SIZE} instituições por importação. Divida o arquivo em lotes menores.`,
      total: instituicoes.length,
      limite: MAX_BATCH_SIZE,
    }, { status: 400 });
  }

  const franchiseId = session.user.role === "FRANQUEADORA" ? undefined : (session.user.franchiseId || undefined);
  const userId = (session.user as any).id || session.user.email || "";

  // Pré-validação e normalização (sem DB)
  const linhasValidas: (InstitutionRow & { name: string; cnpjLimpo: string | null })[] = [];
  const detalhes: DetalheItem[] = [];

  for (const row of instituicoes) {
    const name = (row.name || "").trim();
    if (!name) {
      detalhes.push({ nome: "(sem nome)", status: "erro", motivo: "Nome obrigatório" });
      continue;
    }
    const cnpjLimpo = row.cnpj ? row.cnpj.replace(/\D/g, "") : null;
    linhasValidas.push({ ...row, name, cnpjLimpo });
  }

  // IES não tem CNPJ único no banco — dedup é feito em aplicação, por CNPJ (quando presente)
  // ou por nome exato (case-insensitive), tanto contra o banco quanto dentro do próprio lote.
  const cnpjsParaVerificar = linhasValidas.map(r => r.cnpjLimpo).filter(Boolean) as string[];
  const nomesParaVerificar = linhasValidas.map(r => r.name.toLowerCase());

  const existentes = await prisma.institution.findMany({
    where: {
      OR: [
        ...(cnpjsParaVerificar.length > 0 ? [{ cnpj: { in: cnpjsParaVerificar } }] : []),
        { name: { in: linhasValidas.map(r => r.name), mode: "insensitive" as const } },
      ],
    },
    select: { name: true, cnpj: true },
  });

  const cnpjsExistentes = new Set(existentes.map(e => e.cnpj).filter(Boolean) as string[]);
  const nomesExistentes = new Set(existentes.map(e => e.name.toLowerCase()));

  const linhasParaCriar: (InstitutionRow & { name: string; cnpjLimpo: string | null })[] = [];
  const cnpjsNesteLote = new Set<string>();
  const nomesNesteLote = new Set<string>();

  for (const row of linhasValidas) {
    if (row.cnpjLimpo && cnpjsExistentes.has(row.cnpjLimpo)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "CNPJ já cadastrado no sistema" });
      continue;
    }
    if (!row.cnpjLimpo && nomesExistentes.has(row.name.toLowerCase())) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "Instituição já cadastrada com este nome" });
      continue;
    }
    if (row.cnpjLimpo && cnpjsNesteLote.has(row.cnpjLimpo)) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "CNPJ repetido no arquivo enviado" });
      continue;
    }
    if (!row.cnpjLimpo && nomesNesteLote.has(row.name.toLowerCase())) {
      detalhes.push({ nome: row.name, status: "duplicado", motivo: "Nome repetido no arquivo enviado" });
      continue;
    }
    if (row.cnpjLimpo) cnpjsNesteLote.add(row.cnpjLimpo);
    nomesNesteLote.add(row.name.toLowerCase());
    linhasParaCriar.push(row);
  }

  let importados = 0;

  for (let i = 0; i < linhasParaCriar.length; i += CONCURRENCY) {
    const batch = linhasParaCriar.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (row) => {
      try {
        const cursos = (row.cursos || "")
          .split(/[,;]/)
          .map(c => c.trim())
          .filter(Boolean);

        await prisma.institution.create({
          data: {
            name: row.name,
            razaoSocial: row.razaoSocial || null,
            cnpj: row.cnpjLimpo || null,
            tipo: row.tipo || null,
            email: row.email || null,
            telefone: (row.telefone || "").replace(/\D/g, "").slice(0, 20) || null,
            coordenador: row.coordenador || null,
            cargoCoord: row.cargoCoord || null,
            cidade: row.cidade || null,
            uf: row.uf ? row.uf.toUpperCase().slice(0, 2) : null,
            endereco: row.endereco || null,
            cep: row.cep || null,
            site: row.site || null,
            cursos,
            franchiseId: franchiseId || undefined,
            origem: "MIGRADO",
            migradoEm: new Date(),
            migradoPor: userId,
            migradoPorNome: session.user.name || session.user.email || "",
          },
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
        tipo: "INSTITUICOES",
        franchiseId: franchiseId || null,
        userId,
        arquivo: arquivo || "importacao.xlsx",
        total: instituicoes.length,
        importados,
        duplicados,
        erros,
        detalhes: detalhesParaSalvar,
      },
    });
  } catch {}

  return NextResponse.json({ importados, duplicados, erros, detalhes });
  } catch (e) {
    return handleApiError(e, "INSTITUICOES_IMPORTAR_POST");
  }
}
