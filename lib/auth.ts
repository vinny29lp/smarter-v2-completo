import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // A4: Rate limit por email — 10 tentativas por minuto (proteção contra brute force)
        if (!checkRateLimit(credentials.email, "auth_login", 10, 60_000)) {
          return null;
        }

        // ── Instrumentação de tempo (visível nos logs do Vercel) ──────────
        const DEV = process.env.NODE_ENV === "development";
        const T = { start: Date.now() };
        const lap = (label: string) => {
          const now = Date.now();
          if (DEV) console.log(`[AUTH_PERF] ${label}: ${now - T.start}ms`);
          T.start = now;
        };
        const t0 = Date.now();
        // SEC-B01: email mascarado nos logs — não expor dado pessoal em logs de produção
        const emailMask = credentials.email.replace(/(.{2}).*(@.*)/, "$1***$2");
        if (DEV) console.log(`[AUTH_PERF] authorize() iniciado para: ${emailMask}`);

        // ⚡ select apenas os campos necessários (evita JOINs desnecessários)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true, name: true, email: true, password: true,
            role: true, active: true, franchiseId: true, companyId: true,
            student:  { select: { id: true } },
            employee: { select: { permissoes: true } },
          },
        });
        lap("prisma.user.findUnique");

        if (!user || !user.active) {
          if (DEV) console.log(`[AUTH_PERF] usuário não encontrado ou inativo`);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        lap("bcrypt.compare");

        if (!valid) {
          if (DEV) console.log(`[AUTH_PERF] senha inválida`);
          return null;
        }

        // Log activity + lastLoginAt + abre sessão de rastreamento de horas — NÃO bloqueia o retorno (fire-and-forget)
        Promise.all([
          prisma.activityLog.create({
            data: { userId: user.id, acao: "LOGIN", modulo: "auth", detalhes: `Login de ${user.email}` },
          }),
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.userSessionLog.create({
            data: { userId: user.id, franchiseId: user.franchiseId ?? null },
          }),
        ]).catch(() => {});
        // ↑ fire-and-forget: não esperamos — esses escritos ocorrem em background

        // For FUNCIONARIO and EQUIPE, load their permissoes from the Employee record
        const permissoes: string[] = (user.role === "FUNCIONARIO" || user.role === "EQUIPE")
          ? (user.employee?.permissoes ?? [])
          : [];

        if (DEV) console.log(`[AUTH_PERF] authorize() TOTAL: ${Date.now() - t0}ms — role=${user.role}`);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? "",
          // M3: FRANQUEADORA não tem franchiseId — usa sentinel para não bloquear endpoints de IA
          franchiseId: user.franchiseId ?? (user.role === "FRANQUEADORA" ? "FRANQUEADORA" : undefined),
          companyId: user.companyId ?? undefined,
          studentId: user.student?.id ?? undefined,
          permissoes,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = Date.now();
      if (user) {
        // Primeiro login — preenche token com dados do authorize()
        token.id = user.id;
        token.role = (user as any).role;
        token.franchiseId = (user as any).franchiseId;
        token.companyId = (user as any).companyId;
        token.studentId = (user as any).studentId;
        token.permissoes = (user as any).permissoes ?? [];
        token.lastChecked = Math.floor(Date.now() / 1000);
        if (process.env.NODE_ENV === "development") console.log(`[AUTH_PERF] jwt callback (primeiro login): ${Date.now()-t}ms`);
      } else {
        // Requests subsequentes: verifica se usuário ainda está ativo a cada 1 hora
        const ONE_HOUR = 60 * 60;
        const lastChecked = token.lastChecked as number | undefined;
        if (!lastChecked || Math.floor(Date.now() / 1000) - lastChecked > ONE_HOUR) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { active: true, role: true },
            });
            if (!dbUser || !(dbUser as any).active) {
              // Usuário desativado — invalida o token forçando logout
              return null as any;
            }
            token.lastChecked = Math.floor(Date.now() / 1000);
          } catch {
            // Em caso de erro de DB, mantém o token atual para não derrubar todos os usuários
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = Date.now();
      if (token) {
        // Lê do JWT (sem DB) — deve ser < 5ms
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.franchiseId = token.franchiseId as string | undefined;
        session.user.companyId = token.companyId as string | undefined;
        session.user.studentId = token.studentId as string | undefined;
        session.user.permissoes = token.permissoes as string[] | undefined;
      }
      if (process.env.NODE_ENV === "development") console.log(`[AUTH_PERF] session callback: ${Date.now()-t}ms`);
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas (era 30 dias)
  secret: process.env.NEXTAUTH_SECRET,
};
