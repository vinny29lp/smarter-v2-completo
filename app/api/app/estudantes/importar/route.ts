import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ⚡ ESC-004: limite máximo por request para evitar timeout na Vercel (30s)
const MAX_BATCH_SIZE = 200;
// Concorrência de verificações de duplicidade em paralelo
const CONCURRENCY = 10;

interface StudentRow {
  nome: string;
  cpf?: string;
  email: string;
  telefone?: string;
  celular?: string;
  dataNasc?: string;
  curso?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

type DetalheItem = {
  nome: string;
  email: string;
  status: "importado" | "duplicado" | "erro";
  motivo?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role || "")) {
    return NextResponse.json({ error: "Sem permissão para importar estudantes." }, { status: 403 });
  }

  const body = await req.json();
  const { estudantes, arquivo } = body as { estudantes: StudentRow[]; arquivo: string };

  if (!estudantes || !Array.isArray(estudantes) || estudantes.length === 0) {
    return NextResponse.json({ error: "Nenhum estudante para importar." }, { status: 400 });
  }

  // ⚡ ESC-004: limite de tamanho por batch — impede timeout em imports grandes
  if (estudantes.length > MAX_BATCH_SIZE) {
    return NextResponse.json({
      error: `Máximo de ${MAX_BATCH_SIZE} estudantes por importação. Divida o arquivo em lotes menores.`,
      total: estudantes.length,
      limite: MAX_BATCH_SIZE,
    }, { status: 400 });
  }

  // Estudantes sempre ligados ao Admin (franchiseId = null) para não se perder ao excluir uma unidade
  const franchiseId: undefined = undefined;
  const userId = (session.user as any).id || session.user.email || "";

  // ⚡ ESC-004: Pré-validação e normalização (sem DB) — separar linhas válidas de inválidas
  const linhasValidas: (StudentRow & { nome: string; email: string; cpfLimpo: string | null })[] = [];
  const detalhes: DetalheItem[] = [];

  for (const row of estudantes) {
    const nome = (row.nome || "").trim();
    const email = (row.email || "").trim().toLowerCase();
    if (!nome || !email) {
      detalhes.push({ nome: nome || "(sem nome)", email: email || "(sem email)", status: "erro", motivo: "Nome ou e-mail obrigatório" });
      continue;
    }
    const cpfLimpo = row.cpf ? row.cpf.replace(/\D/g, "") : null;
    linhasValidas.push({ ...row, nome, email, cpfLimpo });
  }

  // ⚡ ESC-004: Verificação de duplicidade em lote — 1 query para todos os emails + CPFs
  const emailsParaVerificar = linhasValidas.map(r => r.email);
  const cpfsParaVerificar   = linhasValidas.map(r => r.cpfLimpo).filter(Boolean) as string[];

  const [studentsExistentes, usersExistentes] = await Promise.all([
    prisma.student.findMany({
      where: {
        OR: [
          { email: { in: emailsParaVerificar } },
          ...(cpfsParaVerificar.length > 0 ? [{ cpf: { in: cpfsParaVerificar } }] : []),
        ],
      },
      select: { email: true, cpf: true },
    }),
    prisma.user.findMany({
      where: { email: { in: emailsParaVerificar } },
      select: { email: true },
    }),
  ]);

  const emailsDuplicados = new Set([
    ...studentsExistentes.map(s => s.email),
    ...usersExistentes.map(u => u.email),
  ]);
  const cpfsDuplicados = new Set(studentsExistentes.map(s => s.cpf).filter(Boolean) as string[]);

  // Separar duplicados das linhas a criar
  const linhasParaCriar: (StudentRow & { nome: string; email: string; cpfLimpo: string | null })[] = [];

  for (const row of linhasValidas) {
    if (emailsDuplicados.has(row.email)) {
      detalhes.push({ nome: row.nome, email: row.email, status: "duplicado", motivo: "E-mail já cadastrado no sistema" });
      continue;
    }
    if (row.cpfLimpo && cpfsDuplicados.has(row.cpfLimpo)) {
      detalhes.push({ nome: row.nome, email: row.email, status: "duplicado", motivo: "CPF já cadastrado no sistema" });
      continue;
    }
    linhasParaCriar.push(row);
  }

  // ⚡ ESC-004: Criar em paralelo com concorrência controlada (batches de CONCURRENCY)
  let importados = 0;
  let erros = 0;

  for (let i = 0; i < linhasParaCriar.length; i += CONCURRENCY) {
    const batch = linhasParaCriar.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (row) => {
      try {
        const senhaPlain = Math.random().toString(36).slice(-8);
        const hash = await bcrypt.hash(senhaPlain, 10);

        let dataNasc: Date | null = null;
        if (row.dataNasc) {
          const d = new Date(row.dataNasc);
          if (!isNaN(d.getTime())) dataNasc = d;
        }

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: row.nome,
              email: row.email,
              password: hash,
              role: "ESTUDANTE",
              franchiseId: franchiseId || undefined,
            },
          });

          await tx.student.create({
            data: {
              userId: user.id,
              name: row.nome,
              cpf: row.cpfLimpo || null,
              email: row.email,
              telefone: (row.telefone || row.celular || "").replace(/\D/g, "").slice(0, 20) || null,
              dataNasc,
              curso: row.curso || "Não informado",
              cep: row.cep || null,
              endereco: row.endereco || null,
              bairro: row.bairro || null,
              cidade: row.cidade || null,
              uf: row.uf ? row.uf.toUpperCase().slice(0, 2) : null,
              franchiseId: franchiseId || undefined,
              habilidades: [],
              status: "DISPONIVEL",
            },
          });
        });

        importados++;
        detalhes.push({ nome: row.nome, email: row.email, status: "importado" });
      } catch (e: any) {
        erros++;
        detalhes.push({ nome: row.nome, email: row.email, status: "erro", motivo: e.message?.slice(0, 100) || "Erro desconhecido" });
      }
    }));
  }

  const duplicados = detalhes.filter(d => d.status === "duplicado").length;
  const errosTotal = detalhes.filter(d => d.status === "erro").length;

  // Registrar log de importação
  try {
    await (prisma as any).importLog.create({
      data: {
        tipo: "ESTUDANTES",
        franchiseId: franchiseId || null,
        userId,
        arquivo: arquivo || "importacao.xlsx",
        total: estudantes.length,
        importados,
        duplicados,
        erros: errosTotal,
      },
    });
  } catch {}

  return NextResponse.json({ importados, duplicados, erros: errosTotal, detalhes });
}
