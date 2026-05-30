import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // Log activity + lastLoginAt
        await Promise.all([
          prisma.activityLog.create({
            data: { userId: user.id, acao: "LOGIN", modulo: "auth", detalhes: `Login de ${user.email}` },
          }),
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
        ]).catch(() => {});

        // For FUNCIONARIO, load their permissoes from the Employee record
        const permissoes: string[] = user.role === "FUNCIONARIO"
          ? (user.employee?.permissoes ?? [])
          : [];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? "",
          franchiseId: user.franchiseId ?? undefined,
          companyId: user.companyId ?? undefined,
          studentId: user.student?.id ?? undefined,
          permissoes,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.franchiseId = (user as any).franchiseId;
        token.companyId = (user as any).companyId;
        token.studentId = (user as any).studentId;
        token.permissoes = (user as any).permissoes ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.franchiseId = token.franchiseId as string | undefined;
        session.user.companyId = token.companyId as string | undefined;
        session.user.studentId = token.studentId as string | undefined;
        session.user.permissoes = token.permissoes as string[] | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
