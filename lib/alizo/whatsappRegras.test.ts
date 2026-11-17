import { describe, it, expect } from "vitest";
import { normalizarWhatsapp, deveContinuarConsultando, PRAZO_ACOMPANHAMENTO_MS } from "./whatsappRegras";

describe("normalizarWhatsapp", () => {
  it("só conecta com status connected explícito", () => {
    expect(normalizarWhatsapp({ status: "connected", phone: "5512999998888" }).estado).toBe("connected");
    expect(normalizarWhatsapp({ status: "qr_pending", connected: true }).estado).toBe("qr_pending");
    expect(normalizarWhatsapp({ qr_code: "x" }).estado).toBe("unknown");
  });
  it("mascara o telefone e entrega o QR como data URL", () => {
    const n = normalizarWhatsapp({ status: "qr_pending", qr_code: "A".repeat(150), phone: "5512999998888" });
    expect(n.qr?.startsWith("data:image/png;base64,")).toBe(true);
    expect(n.telefone).toBe("*********8888");
  });
  it("não expõe QR quando já conectado", () => {
    expect(normalizarWhatsapp({ status: "connected", qr_code: "A".repeat(150) }).qr).toBeNull();
  });
});

describe("deveContinuarConsultando", () => {
  const t0 = 1_000_000;
  it("continua aguardando QR dentro do prazo", () => expect(deveContinuarConsultando("qr_pending", t0, t0 + 10_000)).toBe(true));
  it("para ao conectar, em erro definitivo ou ao expirar", () => {
    expect(deveContinuarConsultando("connected", t0, t0)).toBe(false);
    expect(deveContinuarConsultando("error", t0, t0)).toBe(false);
    expect(deveContinuarConsultando("banned", t0, t0)).toBe(false);
    expect(deveContinuarConsultando("qr_pending", t0, t0 + PRAZO_ACOMPANHAMENTO_MS + 1)).toBe(false);
  });
});

import { estadoConfirmaAcao } from "./whatsappRegras";
describe("estadoConfirmaAcao", () => {
  it("desconectar só confirma com disconnected", () => {
    expect(estadoConfirmaAcao("disconnect", "disconnected")).toBe(true);
    expect(estadoConfirmaAcao("disconnect", "connected")).toBe(false);
    expect(estadoConfirmaAcao("disconnect", "error")).toBe(false);
  });
  it("conectar/reconectar confirma com qr_pending ou connected", () => {
    expect(estadoConfirmaAcao("connect", "qr_pending")).toBe(true);
    expect(estadoConfirmaAcao("reconnect", "connected")).toBe(true);
    expect(estadoConfirmaAcao("connect", "disconnected")).toBe(false);
  });
});
