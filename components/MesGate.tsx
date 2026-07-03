"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MesAvisos } from "@/components/MesAvisos";
import { MesBlockModal } from "@/components/MesBlockModal";

const PING_INTERVAL_MS = 5 * 60 * 1000;

interface MesStatus {
  mesAtual: { mes: number; ano: number };
  dia: number;
  bloqueado: boolean;
  deveAbrir: boolean;
  diasParaBloquear: number;
}

// Abertura/fechamento de mês é exclusivo de unidades franqueadas (FRANQUEADO/FUNCIONARIO).
// FRANQUEADORA e EQUIPE não têm franchiseId de unidade e não são afetados.
const ROLES_COM_MES = ["FRANQUEADO", "FUNCIONARIO"];

export function MesGate({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [mesStatus, setMesStatus] = useState<MesStatus | null>(null);
  const role = session?.user?.role;
  const ativo = sessionStatus === "authenticated" && !!role && ROLES_COM_MES.includes(role);

  useEffect(() => {
    if (!ativo) return;

    let cancelled = false;
    const carregarStatus = () => {
      fetch("/api/app/mes/status")
        .then(r => (r.ok ? r.json() : null))
        .then(data => { if (!cancelled && data) setMesStatus(data); })
        .catch(() => {});
    };
    const enviarPing = () => {
      fetch("/api/app/sessao/ping", { method: "POST" }).catch(() => {});
    };

    carregarStatus();
    enviarPing();
    const interval = setInterval(() => { carregarStatus(); enviarPing(); }, PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ativo]);

  return (
    <>
      {ativo && mesStatus?.deveAbrir && !mesStatus.bloqueado && (
        <MesAvisos diasParaBloquear={mesStatus.diasParaBloquear} urgente={mesStatus.dia >= 3} />
      )}
      {children}
      {ativo && mesStatus?.bloqueado && (
        <MesBlockModal mes={mesStatus.mesAtual.mes} ano={mesStatus.mesAtual.ano} />
      )}
    </>
  );
}
