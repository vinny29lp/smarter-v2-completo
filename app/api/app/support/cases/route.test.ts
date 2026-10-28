import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  sendSupportCase: vi.fn(),
  getSupportMapping: vi.fn(),
  supportCase: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: { findUnique: vi.fn() },
  franchise: { findUnique: vi.fn() },
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportCase: mocks.supportCase,
    user: mocks.user,
    franchise: mocks.franchise,
  },
}));
vi.mock("@/lib/support/ai-workforce", () => ({
  sendSupportCase: mocks.sendSupportCase,
  getSupportMapping: mocks.getSupportMapping,
}));

import { POST } from "./route";

const body = {
  clientRequestId: "33333333-3333-4333-8333-333333333333",
  title: "Erro ao salvar contrato",
  screen: "Editar contrato",
  path: "/dashboard/contratos/123",
  attemptedAction: "Cliquei em salvar",
  errorMessage: "Falha ao salvar",
  problemDescription: "O formulário não concluiu a alteração.",
  occurredAt: "2026-10-28T12:00:00.000Z",
  imageUrl: "",
  technicalData: { locale: "pt-BR" },
};

const request = () => new Request("http://localhost/api/app/support/cases", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST /api/app/support/cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupportMapping.mockReturnValue({ orgId: "org-uuid", unitId: "unit-uuid" });
  });

  it("exige usuário autenticado antes de acessar dados ou integração", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.supportCase.findUnique).not.toHaveBeenCalled();
    expect(mocks.sendSupportCase).not.toHaveBeenCalled();
  });

  it("reenvio de chamado já enviado devolve o mesmo protocolo sem chamar a API novamente", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1", role: "EMPRESA" } });
    mocks.supportCase.findUnique.mockResolvedValue({
      userId: "user-1",
      status: "SENT",
      protocol: "SUP-123",
    });

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ ok: true, created: false, protocol: "SUP-123" });
    expect(data.externalReference).toBe(`smarter-support:${body.clientRequestId}`);
    expect(mocks.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.sendSupportCase).not.toHaveBeenCalled();
  });

  it("não aceita reutilizar a referência idempotente de outro usuário", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-2", role: "EMPRESA" } });
    mocks.supportCase.findUnique.mockResolvedValue({ userId: "user-1", status: "PENDING" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.sendSupportCase).not.toHaveBeenCalled();
  });
});
