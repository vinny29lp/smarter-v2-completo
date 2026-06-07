"use client";
import { SessionProvider } from "next-auth/react";

// ESC-006: nonce prop recebida do Server Component (layout.tsx) e propagada
// para componentes filhos que precisarem (ex: Scripts dinâmicos no futuro).
// Hoje a SessionProvider não precisa do nonce — está aqui para extensibilidade.
export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return <SessionProvider>{children}</SessionProvider>;
}
