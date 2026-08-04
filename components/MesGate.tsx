"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { MesAvisos } from "@/components/MesAvisos";
import { MesBlockModal } from "@/components/MesBlockModal";

// Páginas onde a unidade resolve o bloqueio — o modal nunca pode cobrir essas
// rotas, senão a unidade fica presa sem conseguir se desbloquear. Inclui a de
// fechar (não só a de abrir) porque, com mês anterior pendente, é lá que a
// unidade precisa estar para sair do estado bloqueado.
const ROTAS_DESBLOQUEIO = ["/dashboard/mes/abrir", "/dashboard/mes/fechar"];

const PING_INTERVAL_MS = 5 * 60 * 1000;

interface MesStatus {
  mesAtual: { mes: number; ano: number };
  dia: number;
  bloqueado: boolean;
  deveAbrir: boolean;
  diasParaBloquear: number;
  mesAnteriorPendente?: boolean;
  mesAnterior?: { mes: number; ano: number } | null;
}

// Abertura/fechamento de mês é exclusivo de unidades franqueadas (FRANQUEADO/FUNCIONARIO).
// FRANQUEADORA e EQUIPE não têm franchiseId de unidade e não são afetados.
const ROLES_COM_MES = ["FRANQUEADO", "FUNCIONARIO"];

export function MesGate({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
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

    // Reconsulta ao navegar também — sem isso, depois de abrir o mês na
    // tela de abertura, o modal de bloqueio (estado antigo em memória)
    // continuaria aparecendo por até 5 minutos nas outras telas.
    carregarStatus();
    enviarPing();
    const interval = setInterval(() => { carregarStatus(); enviarPing(); }, PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ativo, pathname]);

  const naPaginaDeDesbloqueio = ROTAS_DESBLOQUEIO.some(r => pathname === r);

  return (
    <>
      {ativo && mesStatus?.deveAbrir && !mesStatus.bloqueado && (
        <MesAvisos diasParaBloquear={mesStatus.diasParaBloquear} urgente={mesStatus.dia >= 3} />
      )}
      {children}
      {ativo && mesStatus?.bloqueado && !naPaginaDeDesbloqueio && (
        <MesBlockModal
          mes={mesStatus.mesAtual.mes}
          ano={mesStatus.mesAtual.ano}
          mesAnteriorPendente={mesStatus.mesAnteriorPendente ? mesStatus.mesAnterior : null}
        />
      )}
    </>
  );
}
