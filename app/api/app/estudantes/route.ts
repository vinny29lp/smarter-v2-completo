import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudents, createStudent } from "@/lib/actions/students";
import { createUser } from "@/lib/actions/auth";
import { enviarBoasVindasEstudante } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET() {
  // Estudantes são públicos a todos os painéis (franqueadora e todas as unidades)
  // Não filtra por franchiseId — todos podem visualizar todos os estudantes
  const estudantes = await getStudents();
  return NextResponse.json({ estudantes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.nome || !body.email || !body.curso) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, email, curso." }, { status: 400 });
  }

  try {
    const franchiseId = body.franchiseId || session?.user?.franchiseId || undefined;
    const senha = body.senha || Math.random().toString(36).slice(-8);
    const user = await createUser({
      name: body.nome, email: body.email, password: senha,
      role: "ESTUDANTE", franchiseId,
    });
    const student = await createStudent({
      userId: user.id, name: body.nome,
      cpf: body.cpf || null, rg: body.rg || null,
      dataNasc: body.dataNasc ? new Date(body.dataNasc) : null,
      sexo: body.sexo || null, email: body.email,
      celular: body.celular || null, telefone: body.telefone || null,
      endereco: body.endereco || null, bairro: body.bairro || null,
      cidade: body.cidade || null, uf: body.uf || null, cep: body.cep || null,
      curso: body.curso, periodo: body.periodo || null,
      previsaoConclusao: body.previsaoConclusao || null,
      institutionId: body.institutionId || null,
      franchiseId,
      observacoes: body.observacoes || null,
      habilidades: [], status: "DISPONIVEL",
    });

    // Enviar email de boas-vindas (aguardamos para garantir envio em serverless)
    if (!body.senha) {
      try {
        const emailOk = await enviarBoasVindasEstudante({
          email: body.email, nome: body.nome, senha, curso: body.curso,
        });
        console.log(`[email] boas-vindas estudante: ${emailOk ? "enviado" : "falhou"} → ${body.email}`);
      } catch (e) {
        console.warn("[email] Falha boas-vindas estudante:", e);
      }
    }

    return NextResponse.json({ student }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "E-mail ou CPF já cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Erro ao criar estudante." }, { status: 500 });
  }
}
