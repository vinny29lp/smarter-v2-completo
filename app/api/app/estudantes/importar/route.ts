import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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

  const franchiseId = session.user.franchiseId || undefined;
  const userId = (session.user as any).id || session.user.email || "";

  const resultado = {
    importados: 0,
    duplicados: 0,
    erros: 0,
    detalhes: [] as { nome: string; email: string; status: "importado" | "duplicado" | "erro"; motivo?: string }[],
  };

  for (const row of estudantes) {
    const nome = (row.nome || "").trim();
    const email = (row.email || "").trim().toLowerCase();

    if (!nome || !email) {
      resultado.erros++;
      resultado.detalhes.push({ nome: nome || "(sem nome)", email: email || "(sem email)", status: "erro", motivo: "Nome ou e-mail obrigatório" });
      continue;
    }

    try {
      // Verificar duplicidade por CPF ou email
      const cpfLimpo = row.cpf ? row.cpf.replace(/\D/g, "") : null;
      const existeStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { email },
            ...(cpfLimpo ? [{ cpf: cpfLimpo }] : []),
          ],
        },
      });

      if (existeStudent) {
        resultado.duplicados++;
        resultado.detalhes.push({ nome, email, status: "duplicado", motivo: "CPF ou e-mail já cadastrado" });
        continue;
      }

      const existeUser = await prisma.user.findFirst({ where: { email } });
      if (existeUser) {
        resultado.duplicados++;
        resultado.detalhes.push({ nome, email, status: "duplicado", motivo: "E-mail já cadastrado no sistema" });
        continue;
      }

      // Criar usuário e estudante
      const senhaPlain = Math.random().toString(36).slice(-8);
      const hash = await bcrypt.hash(senhaPlain, 10);

      const user = await prisma.user.create({
        data: {
          name: nome,
          email,
          password: hash,
          role: "ESTUDANTE",
          franchiseId: franchiseId || undefined,
        },
      });

      // Parsear data de nascimento
      let dataNasc: Date | null = null;
      if (row.dataNasc) {
        const d = new Date(row.dataNasc);
        if (!isNaN(d.getTime())) dataNasc = d;
      }

      await prisma.student.create({
        data: {
          userId: user.id,
          name: nome,
          cpf: cpfLimpo || null,
          email,
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

      resultado.importados++;
      resultado.detalhes.push({ nome, email, status: "importado" });
    } catch (e: any) {
      resultado.erros++;
      resultado.detalhes.push({ nome, email, status: "erro", motivo: e.message?.slice(0, 100) || "Erro desconhecido" });
    }
  }

  // Registrar log de importação
  try {
    await (prisma as any).importLog.create({
      data: {
        tipo: "ESTUDANTES",
        franchiseId: franchiseId || null,
        userId,
        arquivo: arquivo || "importacao.xlsx",
        total: estudantes.length,
        importados: resultado.importados,
        duplicados: resultado.duplicados,
        erros: resultado.erros,
      },
    });
  } catch {}

  return NextResponse.json(resultado);
}
