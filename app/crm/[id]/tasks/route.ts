import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const task = await prisma.crmTask.create({
    data: {
      leadId:     params.id,
      descricao:  body.descricao,
      dueAt:      body.dueAt ? new Date(body.dueAt) : null,
      linkReuniao:body.linkReuniao || null,
      endereco:   body.endereco || null,
    },
  });
  return NextResponse.json({ task });
}
