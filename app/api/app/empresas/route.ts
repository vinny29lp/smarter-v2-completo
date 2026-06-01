import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanies } from "@/lib/actions/companies";
import { prisma } from "@/lib/prisma";
import { enviarBoasVindasEmpresa } from "@/lib/email";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  // FRANQUEADORA vê todas; demais papéis só vêem as da sua unidade
  const franchiseId = role === "FRANQUEADORA" ? undefined : (session?.user?.franchiseId || null);
  const empresas = await getCompanies(franchiseId ?? undefined);
  return NextResponse.json({ empresas });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.name || !body.cnpj || !body.email || !body.cidade) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, CNPJ, email, cidade." }, { status: 400 });
  }

  const franchiseId = body.franchiseId || session?.user?.franchiseId || undefined;

  let company: any = null;
  // Gera a senha UMA vez — usada no user.create e no email
  const senhaPlain = Math.random().toString(36).slice(-8) + "S1!";

  try {
    // Cria a empresa via prisma direto (evita revalidatePath de Server Action em Route Handler)
    company = await prisma.company.create({
      data: {
        name: body.name,
        razaoSocial: body.razaoSocial || "",
        cnpj: body.cnpj,
        setor: body.setor || null,
        email: body.email,
        telefone: body.telefone || null,
        responsavel: body.responsavel || null,
        cargoResponsavel: body.cargoResponsavel || null,
        endereco: body.endereco || null,
        bairro: body.bairro || null,
        cidade: body.cidade,
        uf: body.uf || "",
        cep: body.cep || null,
        site: body.site || null,
        emailFinanceiro: body.emailFinanceiro || null,
        franchiseId: franchiseId || undefined,
      },
    });

    // Gamificação (opcional — não bloqueia se falhar)
    await prisma.gamificationPoint.create({
      data: { franchiseId: franchiseId || "", acao: "empresa_cadastrada", pontos: 300 },
    }).catch(() => {});

    // Cria usuário de acesso ao portal da empresa automaticamente
    const hash = await bcrypt.hash(senhaPlain, 12);
    await prisma.user.create({
      data: {
        name: body.responsavel || body.name,
        email: body.email,
        password: hash,
        role: "EMPRESA",
        companyId: company.id,
        franchiseId: franchiseId || undefined,
        active: true,
      },
    }).catch(() => {
      // Se o e-mail já existe (P2002) — empresa pode já ter acesso criado; ignora
    });

  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "CNPJ ou e-mail já cadastrado no sistema." }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Erro ao cadastrar empresa." }, { status: 500 });
  }

  // Email de boas-vindas fora do try/catch de criação — sempre enviado com a senha gerada
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";
    const emailOk = await enviarBoasVindasEmpresa({
      email: body.email,
      nomeEmpresa: body.name,
      nomeResponsavel: body.responsavel || body.name,
      senha: senhaPlain,
      loginUrl: appUrl,
    });
    console.log(`[email] boas-vindas empresa: ${emailOk ? "enviado" : "falhou"} → ${body.email}`);
  } catch (emailErr) {
    console.warn("[email] Falha boas-vindas empresa:", emailErr);
  }

  return NextResponse.json({ company }, { status: 201 });
}
