import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/api-response";
import { enviarBoasVindasFranqueado } from "@/lib/email";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  // FRANQUEADORA pode ver qualquer franqueado; FRANQUEADO só pode ver o próprio
  if (role !== "FRANQUEADORA" && session.user.franchiseId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const franchise = await prisma.franchise.findUnique({
    where: { id: params.id },
    include: {
      users: {
        where: { role: "FRANQUEADO" },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
      },
      companies: { select: { id: true, name: true, status: true } },
      // ALTO-A: take:50 — evita carregamento de centenas de contratos históricos.
      // Front-end usa rota /api/app/contratos?franchiseId=X para listagem completa paginada.
      contracts: {
        select: {
          id: true, numero: true, status: true, tipoEstagio: true,
          bolsa: true, valorEmpresa: true, dataInicio: true, dataFim: true, createdAt: true,
          student: { select: { id: true, name: true, status: true } },
          company:  { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      financials: { orderBy: { createdAt: "desc" }, take: 30 },
      _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
    },
  });
  if (!franchise) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  return NextResponse.json({ franchise });
  } catch (e) {
    return handleApiError(e, "FRANQUEADOS_ID_GET");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }
  const body = await req.json();

  // Bloquear/desbloquear acesso
  if (body.action === "toggle_access") {
    const users = await prisma.user.findMany({ where: { franchiseId: params.id, role: "FRANQUEADO" } });
    const newActive = !users[0]?.active;
    await prisma.user.updateMany({ where: { franchiseId: params.id, role: "FRANQUEADO" }, data: { active: newActive } });
    return NextResponse.json({ active: newActive });
  }

  // Bloqueio por inadimplência: bloqueia o acesso da unidade (página /bloqueado)
  if (body.action === "bloquear_inadimplencia") {
    const franchise = await prisma.franchise.update({
      where: { id: params.id },
      data: {
        acessoBloqueado: true,
        bloqueadoEm: new Date(),
        bloqueioMotivo: `MANUAL: ${String(body.motivo || "Bloqueado pela Franqueadora").slice(0, 300)}`,
        bloqueioLiberadoAte: null,
      } as any,
    });
    return NextResponse.json({ ok: true, franchise });
  }

  // Válvula de escape: libera o acesso mesmo sem pagamento (negociação/tolerância).
  // toleranciaDias > 0 → o cron de inadimplência não volta a bloquear até essa data.
  if (body.action === "liberar_inadimplencia") {
    const dias = parseInt(String(body.toleranciaDias || 0)) || 0;
    const liberadoAte = dias > 0 ? new Date(Date.now() + dias * 86400000) : null;
    const franchise = await prisma.franchise.update({
      where: { id: params.id },
      data: {
        acessoBloqueado: false,
        bloqueadoEm: null,
        bloqueioMotivo: null,
        bloqueioLiberadoAte: liberadoAte,
      } as any,
    });
    return NextResponse.json({ ok: true, franchise, toleranciaAte: liberadoAte });
  }

  // Alterar email de login
  if (body.action === "change_email" && body.userId && body.email) {
    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { email: body.email },
    });
    return NextResponse.json({ user });
  }

  // Alterar senha
  if (body.action === "change_password" && body.userId && body.password) {
    const hash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id: body.userId }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  }

  // Reenviar email de boas-vindas (gera nova senha temporária + envia email)
  if (body.action === "reenviar_boasvindas") {
    const franchise = await prisma.franchise.findUnique({
      where: { id: params.id },
      include: { users: { where: { role: "FRANQUEADO" }, take: 1 } },
    });
    if (!franchise) return NextResponse.json({ error: "Franqueado não encontrado." }, { status: 404 });
    const franqUser = franchise.users[0];
    if (!franqUser) return NextResponse.json(
      { error: "Nenhum usuário FRANQUEADO vinculado. Use 'Criar Acesso' para criar o usuário primeiro." },
      { status: 404 }
    );

    // Gera nova senha temporária e atualiza no banco
    const novaSenha = require("crypto").randomBytes(6).toString("hex") + "S1@";
    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: franqUser.id }, data: { password: hash } });

    // Envia email com as novas credenciais
    let emailEnviado = false;
    let emailErro = "";
    try {
      emailEnviado = await enviarBoasVindasFranqueado({
        email: franqUser.email,
        nome: franqUser.name || franchise.responsavel || "",
        nomeUnidade: franchise.name,
        senha: novaSenha,
      });
      if (!emailEnviado) emailErro = "Resend retornou erro. Verifique RESEND_API_KEY e se o e-mail é válido.";
    } catch (err: any) {
      emailErro = err?.message || "Exceção ao chamar Resend";
      console.error("[Franqueados] reenviar_boasvindas email error:", err);
    }

    return NextResponse.json({ ok: true, emailEnviado, emailErro: emailEnviado ? undefined : emailErro, email: franqUser.email, senhaGerada: novaSenha });
  }

  // Criar usuário para franquia órfã (sem usuário FRANQUEADO vinculado)
  if (body.action === "criar_usuario") {
    const emailLogin = (body.email || "").trim().toLowerCase();
    if (!emailLogin) return NextResponse.json({ error: "E-mail é obrigatório para criar o usuário." }, { status: 400 });

    const franchise = await prisma.franchise.findUnique({
      where: { id: params.id },
      include: { users: { where: { role: "FRANQUEADO" }, take: 1 } },
    });
    if (!franchise) return NextResponse.json({ error: "Franqueado não encontrado." }, { status: 404 });
    if (franchise.users[0]) return NextResponse.json({ error: "Esta unidade já possui um usuário de acesso vinculado." }, { status: 409 });

    const emailExistente = await prisma.user.findUnique({ where: { email: emailLogin }, select: { id: true } });
    if (emailExistente) return NextResponse.json(
      { error: `O e-mail "${emailLogin}" já está em uso por outro usuário.` },
      { status: 409 }
    );

    const senha = require("crypto").randomBytes(6).toString("hex") + "S1@";
    const hash = await bcrypt.hash(senha, 10);
    const novoUser = await prisma.user.create({
      data: {
        name: body.nome || franchise.responsavel || "",
        email: emailLogin,
        password: hash,
        role: "FRANQUEADO",
        franchiseId: franchise.id,
      },
    });

    let emailEnviado = false;
    let emailErro = "";
    try {
      emailEnviado = await enviarBoasVindasFranqueado({
        email: novoUser.email,
        nome: novoUser.name || "",
        nomeUnidade: franchise.name,
        senha,
      });
      if (!emailEnviado) emailErro = "Resend retornou erro. Verifique RESEND_API_KEY e se o e-mail é válido.";
    } catch (err: any) {
      emailErro = err?.message || "Exceção ao chamar Resend";
      console.error("[Franqueados] criar_usuario email error:", err);
    }

    return NextResponse.json({ ok: true, user: novoUser, senhaGerada: senha, emailEnviado, emailErro: emailEnviado ? undefined : emailErro });
  }

  // Toggle cobrarMensalidade
  if (body.action === "toggle_mensalidade") {
    const current = await prisma.franchise.findUnique({ where: { id: params.id }, select: { cobrarMensalidade: true } });
    const franchise = await prisma.franchise.update({
      where: { id: params.id },
      data: { cobrarMensalidade: !(current?.cobrarMensalidade ?? true) },
    });
    return NextResponse.json({ franchise, cobrarMensalidade: franchise.cobrarMensalidade });
  }

  // Atualizar dados da franquia
  const franchise = await prisma.franchise.update({
    where: { id: params.id },
    data: {
      name: body.name, razaoSocial: body.razaoSocial,
      cnpj: body.cnpj !== undefined ? (body.cnpj ? body.cnpj.replace(/\D/g, "") : null) : undefined,
      cpf: body.cpf !== undefined ? (body.cpf ? body.cpf.replace(/\D/g, "") : null) : undefined,
      dataNasc: body.dataNasc !== undefined ? (body.dataNasc ? new Date(body.dataNasc) : null) : undefined,
      responsavel: body.responsavel, email: body.email, telefone: body.telefone,
      cidade: body.cidade, uf: body.uf, endereco: body.endereco, cep: body.cep || undefined,
      mensalidade: body.mensalidade ? parseFloat(body.mensalidade) : undefined,
      cobrarMensalidade: body.cobrarMensalidade !== undefined ? body.cobrarMensalidade : undefined,
      // Dia de vencimento da Taxa de Desenvolvimento (1–28) — fica fixo e recorrente
      diaVencimentoTaxa: body.diaVencimentoTaxa !== undefined
        ? Math.min(Math.max(parseInt(String(body.diaVencimentoTaxa)) || 10, 1), 28)
        : undefined,
      status: body.status,
    } as any,
  });
  return NextResponse.json({ franchise });
  } catch (e) {
    return handleApiError(e, "FRANQUEADOS_ID_PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir franqueados." }, { status: 403 });
  }

  // Segurança: bloqueia exclusão se houver contratos vinculados
  const contractCount = await prisma.contract.count({ where: { franchiseId: params.id } });
  if (contractCount > 0) {
    return NextResponse.json({
      error: `Não é possível excluir: este franqueado possui ${contractCount} contrato(s). Archive-o ou transfira os dados antes de excluir.`,
    }, { status: 400 });
  }

  const franchise = await prisma.franchise.findUnique({
    where: { id: params.id },
    include: {
      companies: { select: { id: true } },
      students: { select: { id: true, userId: true } },
      users: { select: { id: true } },
    },
  });
  if (!franchise) return NextResponse.json({ error: "Franqueado não encontrado." }, { status: 404 });

  const companyIds = franchise.companies.map((c: any) => c.id);
  const studentUserIds = franchise.students.map((s: any) => s.userId).filter(Boolean) as string[];
  const franchiseUserIds = franchise.users.map((u: any) => u.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. CRM Tasks → CRM Leads (CrmNota cascades automaticamente)
      await tx.crmTask.deleteMany({ where: { lead: { franchiseId: params.id } } });
      await tx.crmLead.deleteMany({ where: { franchiseId: params.id } });

      // 2. Dados das empresas (vacâncias, candidaturas, financeiros)
      if (companyIds.length > 0) {
        await tx.application.deleteMany({ where: { vacancy: { companyId: { in: companyIds } } } });
        await tx.vacancy.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.financial.deleteMany({ where: { companyId: { in: companyIds } } });

        const companyUserIds = (await tx.user.findMany({
          where: { companyId: { in: companyIds } },
          select: { id: true },
        })).map((u: any) => u.id);
        if (companyUserIds.length > 0) {
          await tx.activityLog.deleteMany({ where: { userId: { in: companyUserIds } } });
          await tx.notification.deleteMany({ where: { userId: { in: companyUserIds } } });
          await tx.user.deleteMany({ where: { id: { in: companyUserIds } } });
        }
      }
      await tx.company.deleteMany({ where: { franchiseId: params.id } });

      // 3. DESVINCULA estudantes — NÃO deleta perfis, apenas remove o vínculo com a franquia
      //    Os estudantes ficam visíveis no Admin e mantêm todos os seus dados
      await tx.student.updateMany({
        where: { franchiseId: params.id },
        data: { franchiseId: null },
      });
      if (studentUserIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: studentUserIds }, role: "ESTUDANTE" },
          data: { franchiseId: null },
        });
      }

      // 4. Dados da franquia em si
      await tx.financial.deleteMany({ where: { franchiseId: params.id } });
      await tx.gamificationConfig.deleteMany({ where: { franchiseId: params.id } });
      await tx.gamificationPoint.deleteMany({ where: { franchiseId: params.id } });
      await tx.aIUsageLog.deleteMany({ where: { franchiseId: params.id } });

      // 5. Usuários da franquia (FRANQUEADO/FUNCIONARIO — não ESTUDANTE)
      if (franchiseUserIds.length > 0) {
        await tx.activityLog.deleteMany({ where: { userId: { in: franchiseUserIds } } });
        await tx.notification.deleteMany({ where: { userId: { in: franchiseUserIds } } });
      }
      await tx.employee.deleteMany({ where: { franchiseId: params.id } });
      // Deleta apenas usuários da franquia que NÃO são estudantes (já desvinculados acima)
      await tx.user.deleteMany({ where: { franchiseId: params.id, role: { not: "ESTUDANTE" } } });

      // 6. Excluir franquia
      await tx.franchise.delete({ where: { id: params.id } });
    }, { timeout: 30000 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir franqueado." }, { status: 500 });
  }
}
