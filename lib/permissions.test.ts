import { describe, it, expect } from "vitest";
import { checkPermission } from "./permissions";
import type { Session } from "next-auth";

function sessionFor(role: string, permissoes?: string[]): Session {
  return {
    user: { role, permissoes } as any,
    expires: "",
  } as Session;
}

describe("checkPermission", () => {
  it("libera FRANQUEADORA para qualquer módulo, mesmo sem permissoes", () => {
    expect(checkPermission(sessionFor("FRANQUEADORA"), "empresas")).toBeNull();
  });

  it("libera FRANQUEADO para qualquer módulo, mesmo sem permissoes", () => {
    expect(checkPermission(sessionFor("FRANQUEADO"), "empresas")).toBeNull();
  });

  it("libera FUNCIONARIO com a permissão 'empresas' concedida", () => {
    expect(checkPermission(sessionFor("FUNCIONARIO", ["empresas"]), "empresas")).toBeNull();
  });

  it("bloqueia FUNCIONARIO sem a permissão 'empresas' — CPS e Proposta Comercial ficam travados", () => {
    const result = checkPermission(sessionFor("FUNCIONARIO", ["financeiro"]), "empresas");
    expect(result).not.toBeNull();
  });

  it("bloqueia FUNCIONARIO sem nenhuma permissoes definida", () => {
    const result = checkPermission(sessionFor("FUNCIONARIO"), "empresas");
    expect(result).not.toBeNull();
  });
});
