import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      franchiseId?: string;
      companyId?: string;
      studentId?: string;
      permissoes?: string[];
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role: string;
    franchiseId?: string;
    companyId?: string;
    studentId?: string;
    permissoes?: string[];
  }
}
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    franchiseId?: string;
    companyId?: string;
    studentId?: string;
    permissoes?: string[];
  }
}
