import { defineConfig } from "vitest/config";
import path from "node:path";

// Alias "@/" igual ao tsconfig, para testar módulos que importam "@/lib/..." (com mocks).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd()) } },
});
