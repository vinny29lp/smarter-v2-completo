import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
import { tokenLevantamentoVagaValido } from "@/lib/automacao/token";
import { abrirVagaDeSolicitacao } from "@/lib/vagas/abrirDeSolicitacao";
import { convidarParaVagaAgora } from "@/lib/automacao/lia";

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

  const sol = await (prisma as any).vagaSolicitacao.create({
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

  // Link gerado pelo sistema (com token válido): a vaga abre sozinha e a Lia já chama os candidatos.
  // Sem token (links antigos), segue como solicitação PENDENTE para a unidade converter à mão.
  let vagaAberta = false;
  if (tokenLevantamentoVagaValido(empresa.id, String(body.t || ""))) {
    try {
      const r = await abrirVagaDeSolicitacao(sol.id);
      if (r.ok) {
        vagaAberta = true;
        const c = await convidarParaVagaAgora(r.vagaId).catch(() => ({ convidados: 0, elegiveis: 0 }));
        const usuarios = await prisma.user.findMany({ where: { franchiseId: r.franchiseId, role: "FRANQUEADO", active: true }, select: { id: true } });
        if (usuarios.length) {
          await prisma.notification.createMany({
            data: usuarios.map(u => ({
              userId: u.id, tipo: "lia_automacao", link: `/dashboard/vagas/${r.vagaId}`,
              titulo: "🤖 Vaga aberta automaticamente",
              mensagem: `${r.empresa} enviou o levantamento de perfil e eu abri a vaga "${r.titulo}". ${c.convidados > 0 ? `Já convidei ${c.convidados} candidato(s) compatível(is) por e-mail.` : "Não achei candidatos compatíveis no banco — abra a vaga para ver onde divulgar."}`,
            })),
          });
        }
      }
    } catch (e: any) {
      console.error("[solicitar-vaga] abertura automática falhou (fica pendente):", e?.message);
    }
  }

  return NextResponse.json({ ok: true, vagaAberta });
}
