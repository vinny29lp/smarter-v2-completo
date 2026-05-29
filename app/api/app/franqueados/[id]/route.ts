import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const franchise = await prisma.franchise.findUnique({
    where: { id: params.id },
    include: {
      users: {
        where: { role: "FRANQUEADO" },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
      },
      companies: { select: { id: true, name: true, status: true } },
      contracts: {
        include: { student: true, company: true },
        orderBy: { createdAt: "desc" },
      },
      financials: { orderBy: { createdAt: "desc" }, take: 30 },
      _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
    },
  });
  if (!franchise) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  return NextResponse.json({ franchise });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
      name: body.name, razaoSocial: body.razaoSocial, cnpj: body.cnpj,
      responsavel: body.responsavel, email: body.email, telefone: body.telefone,
      cidade: body.cidade, uf: body.uf, endereco: body.endereco,
      mensalidade: body.mensalidade ? parseFloat(body.mensalidade) : undefined,
      cobrarMensalidade: body.cobrarMensalidade !== undefined ? body.cobrarMensalidade : undefined,
      status: body.status,
    },
  });
  return NextResponse.json({ franchise });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir franqueados." }, { status: 403 });
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
  const studentIds = franchise.students.map((s: any) => s.id);
  const studentUserIds = franchise.students.map((s: any) => s.userId).filter(Boolean) as string[];
  const franchiseUserIds = franchise.users.map((u: any) => u.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Contatos de contratos da franquia
      await tx.evaluation.deleteMany({ where: { contract: { franchiseId: params.id } } });
      await tx.internshipDocument.deleteMany({ where: { contract: { franchiseId: params.id } } });
      await tx.financial.deleteMany({ where: { contract: { franchiseId: params.id } } });
      await tx.contract.deleteMany({ where: { franchiseId: params.id } });

      // 2. CRM Tasks → CRM Leads (CrmNota cascades automaticamente)
      await tx.crmTask.deleteMany({ where: { lead: { franchiseId: params.id } } });
      await tx.crmLead.deleteMany({ where: { franchiseId: params.id } });

      // 3. Dados das empresas (vacâncias, candidaturas, financeiros)
      if (companyIds.length > 0) {
        await tx.application.deleteMany({ where: { vacancy: { companyId: { in: companyIds } } } });
        await tx.vacancy.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.financial.deleteMany({ where: { companyId: { in: companyIds } } });

        // Usuários das empresas (notificações e logs primeiro)
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

      // 4. Dados dos estudantes da franquia
      if (studentIds.length > 0) {
        await tx.application.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.discTest.deleteMany({ where: { studentId: { in: studentIds } } });
        if (studentUserIds.length > 0) {
          await tx.activityLog.deleteMany({ where: { userId: { in: studentUserIds } } });
          await tx.notification.deleteMany({ where: { userId: { in: studentUserIds } } });
        }
        // Deletar estudante primeiro (libera FK userId), depois o usuário
        await tx.student.deleteMany({ where: { id: { in: studentIds } } });
        if (studentUserIds.length > 0) {
          await tx.user.deleteMany({ where: { id: { in: studentUserIds } } });
        }
      }

      // 5. Dados da franquia em si
      await tx.financial.deleteMany({ where: { franchiseId: params.id } });
      await tx.gamificationConfig.deleteMany({ where: { franchiseId: params.id } });
      await tx.gamificationPoint.deleteMany({ where: { franchiseId: params.id } });
      await tx.aIUsageLog.deleteMany({ where: { franchiseId: params.id } });

      // 6. Usuários da franquia (funcionários e franqueados — employee antes de user)
      if (franchiseUserIds.length > 0) {
        await tx.activityLog.deleteMany({ where: { userId: { in: franchiseUserIds } } });
        await tx.notification.deleteMany({ where: { userId: { in: franchiseUserIds } } });
      }
      await tx.employee.deleteMany({ where: { franchiseId: params.id } });
      await tx.user.deleteMany({ where: { franchiseId: params.id } });

      // 7. Excluir franquia
      await tx.franchise.delete({ where: { id: params.id } });
    }, { timeout: 30000 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir franqueado." }, { status: 500 });
  }
}
