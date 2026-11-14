import { describe, it, expect } from "vitest";
import { ehOrigemSmarter } from "./origem";
describe("origem", () => {
  it("reconhece leads da Smarter", () => { expect(ehOrigemSmarter("smarter_crm")).toBe(true); expect(ehOrigemSmarter("smarter_teste")).toBe(true); });
  it("entrada e maps são importados", () => {
    for (const s of ["google_maps", "receptionist_inbound", "unknown_inbound", "meta_ads", "", null, undefined]) expect(ehOrigemSmarter(s as any)).toBe(false);
  });
});
