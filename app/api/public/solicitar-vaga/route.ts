import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIpFromRequest(req);
  if (!checkRateLimit(ip, "solicitar_vaga", 5, 60_000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = await req.json();

  if (!body.empresaId) {
    return NextResponse.json({ error: "Link inválido. Solicite um novo link à sua unidade Smarter." }, { status: 400 });
  }

  if (!body.funcao || !body.atividades || !body.bolsa || !body.horario || !body.diasTrabalho || !body.supervisorNome) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  // Verificar que a empresa existe
  const empresa = await prisma.company.findUnique({
    where: { id: body.empresaId },
    select: { id: true, franchiseId: true },
  });

  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  await (prisma as any).vagaSolicitacao.create({
    data: {
      companyId:          empresa.id,
      franchiseId:        empresa.franchiseId || null,
      funcao:             String(body.funcao).slice(0, 200),
      atividades:         String(body.atividades).slice(0, 3000),
      bolsa:              parseFloat(body.bolsa),
      auxTransporte:      body.auxTransporte ? parseFloat(body.auxTransporte) : null,
      horario:            String(body.horario).slice(0, 100),
      diasTrabalho:       String(body.diasTrabalho).slice(0, 100),
      cargaHoraria:       body.cargaHoraria ? parseInt(body.cargaHoraria) : 30,
      beneficios:         body.beneficios ? String(body.beneficios).slice(0, 500) : null,
      modalidade:         body.modalidade || "Presencial",
      cursoDesejado:      body.cursoDesejado ? String(body.cursoDesejado).slice(0, 200) : null,
      preferenciaGenero:  body.preferenciaGenero || "indiferente",
      nivel:              body.nivel || null,
      observacoes:        body.observacoes ? String(body.observacoes).slice(0, 1000) : null,
      supervisorNome:     String(body.supervisorNome).slice(0, 200),
      supervisorCargo:    body.supervisorCargo ? String(body.supervisorCargo).slice(0, 100) : null,
      supervisorEmail:    body.supervisorEmail ? String(body.supervisorEmail).slice(0, 200) : null,
      supervisorTel:      body.supervisorTel   ? String(body.supervisorTel).slice(0, 30)  : null,
      status:             "PENDENTE",
    },
  });

  return NextResponse.json({ ok: true });
}
