/**
 * permissions.ts — Helper de permissões de funcionário
 * Sprint 02 — PERM-001
 *
 * Centraliza a verificação de permissões de FUNCIONARIO nas APIs.
 * Retorna 403 se a permissão não está presente.
 */

import { Session } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Mapeamento de módulo → chave de permissão no array permissoes do Employee.
 * Qualquer rota que lida com estes recursos deve chamar checkPermission().
 */
export const PERMISSION_MAP: Record<string, string> = {
  financeiro:   "financeiro",
  contratos:    "contratos",
  crm:          "crm",
  empresas:     "empresas",
  estudantes:   "estudantes",
  processos:    "processos",
  instituicoes: "instituicoes",
  assinaturas:  "assinaturas",
  config:       "config",
};

/**
 * Verifica se a sessão tem permissão para acessar o módulo.
 *
 * Regras:
 * - FRANQUEADORA e FRANQUEADO: acesso total a todos os módulos.
 * - FUNCIONARIO: só acessa os módulos listados em session.user.permissoes.
 * - Outros roles (EMPRESA, ESTUDANTE): sem acesso (401 já tratado antes).
 *
 * Retorna null se ok, ou um NextResponse 403 pronto para retornar.
 */
export function checkPermission(
  session: Session,
  modulo: string
): NextResponse | null {
  const role = session.user.role || "";

  // Admins têm acesso total
  if (role === "FRANQUEADORA" || role === "FRANQUEADO") {
    return null;
  }

  // FUNCIONARIO: checar permissão específica
  if (role === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    const permKey = PERMISSION_MAP[modulo] || modulo;
    if (!permissoes.includes(permKey)) {
      return NextResponse.json(
        { error: "Acesso negado. Sem permissão para este módulo." },
        { status: 403 }
      );
    }
    return null;
  }

  // Outros roles não deveriam chegar aqui, mas retorna 403 como fallback
  return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
}
