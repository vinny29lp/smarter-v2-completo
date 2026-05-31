import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.cnpj || !body.email) {
    return NextResponse.json({ error: "Dados obrigatórios faltando." }, { status: 400 });
  }

  // Verificar CNPJ duplicado
  const existing = await prisma.company.findFirst({ where: { cnpj: body.cnpj } });
  if (existing) return NextResponse.json({ error: "CNPJ já cadastrado." }, { status: 409 });

  // Buscar franquia pelo ref
  let franchiseId: string | undefined;
  if (body.franchiseRef) {
    const f = await prisma.franchise.findUnique({ where: { id: body.franchiseRef } });
    if (f) franchiseId = f.id;
  }
  // Fallback: primeira franquia ativa
  if (!franchiseId) {
    const f = await prisma.franchise.findFirst({ where: { status: "ATIVO" } });
    franchiseId = f?.id;
  }

  if (!franchiseId) return NextResponse.json({ error: "Franquia não encontrada." }, { status: 400 });

  const company = await prisma.company.create({
    data: {
      name: body.name, razaoSocial: body.razaoSocial || body.name,
      cnpj: body.cnpj, setor: body.setor || "", email: body.email,
      telefone: body.telefone || "", responsavel: body.responsavel || "",
      cargoResponsavel: body.cargoResponsavel || "",
      site: body.site || "",
      endereco: body.endereco || "", bairro: body.bairro || "",
      cidade: body.cidade || "", uf: body.uf || "", cep: body.cep || "",
      status: "PENDENTE",
      pendente: true,
      franchiseId,
    },
  });

  // Criar lead CRM automaticamente
  await prisma.crmLead.create({
    data: {
      empresa: body.name, contato: body.responsavel, email: body.email,
      telefone: body.telefone, etapa: "novo_lead", prioridade: "alta",
      anotacao: "Lead gerado via auto-cadastro público",
      franchiseId, companyId: company.id,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, companyId: company.id });
}
