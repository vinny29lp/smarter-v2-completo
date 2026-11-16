import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.cnpj || !body.email) {
    return NextResponse.json({ error: "Dados obrigatórios faltando." }, { status: 400 });
  }

  // Verificar CNPJ duplicado comparando só os dígitos (com ou sem pontuação é a mesma empresa)
  const digitos = String(body.cnpj).replace(/\D/g, "");
  if (digitos.length !== 14) return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  const duplicada = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM companies WHERE regexp_replace(cnpj, '[^0-9]', '', 'g') = ${digitos} LIMIT 1`;
  if (duplicada.length > 0) return NextResponse.json({ error: "CNPJ já cadastrado." }, { status: 409 });
  body.cnpj = digitos;

  // Buscar franquia pelo ref
  let franchiseId: string | undefined;
  if (body.franchiseRef) {
    const f = await prisma.franchise.findUnique({ where: { id: body.franchiseRef } });
    if (f) franchiseId = f.id;
  }
  // Sem unidade de origem válida (link sem ?ref=): NÃO escolhe uma franquia ao acaso — o cadastro fica sem unidade,
  // visível só à Franqueadora, que direciona. (Antes caía na "primeira franquia ativa" e ia para a unidade errada.)
  if (body.franchiseRef && !franchiseId) console.warn("[cadastro-empresa] ref inválido:", String(body.franchiseRef).slice(0, 40));

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
      franchiseId: franchiseId ?? null,
    },
  });

  // Criar lead CRM automaticamente
  await prisma.crmLead.create({
    data: {
      empresa: body.name, contato: body.responsavel, email: body.email,
      telefone: body.telefone, etapa: "novo_lead", prioridade: "alta",
      anotacao: "Lead gerado via auto-cadastro público",
      franchiseId: franchiseId ?? null, companyId: company.id,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, companyId: company.id });
}
