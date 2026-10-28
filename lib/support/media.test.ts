import { describe, expect, it } from "vitest";
import { parseSupportMedia } from "./media";

const image = { kind: "image", mimeType: "image/png", base64: "YWJj", caption: "erro", sourceMessageId: "msg-1" };

describe("parseSupportMedia", () => {
  it("bloqueia mídia sem consentimento explícito", () => {
    expect(parseSupportMedia([image], false)).toMatchObject({ media: [], error: expect.stringContaining("Autorize") });
  });
  it("aceita mídia válida somente com consentimento", () => {
    expect(parseSupportMedia([image], true)).toEqual({ media: [image] });
  });
  it("limita a três arquivos", () => {
    expect(parseSupportMedia([image, image, image, image], true).error).toContain("três");
  });
});
