"use client";
import { useState } from "react";
import { Copy, Check, RefreshCw, KeyRound, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface TokenStatus {
  existe: boolean;
  ativo: boolean;
  criadoEm: string | null;
  ultimoUso: string | null;
}

function formatData(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
      {copiado ? "Copiado!" : label}
    </Button>
  );
}

interface Props {
  titulo: string;
  descricao: string;
  scope: "crm" | "recruitment" | "marketing" | "franquia_crm";
  // null para tokens de nível rede (hoje só "franquia_crm") — não amarrados
  // a nenhuma unidade selecionada no seletor da tela.
  franchiseId: string | null;
  status: TokenStatus;
  onChanged: () => void;
  children?: React.ReactNode;
}

export function ScopeTokenCard({ titulo, descricao, scope, franchiseId, status, onChanged, children }: Props) {
  const [gerando, setGerando] = useState(false);
  const [novoToken, setNovoToken] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const gerar = async () => {
    if (status.existe) {
      const ok = window.confirm(
        "Regenerar vai gerar um token novo e o token atual PARA DE FUNCIONAR imediatamente. A Alizo vai precisar do novo token para continuar integrada. Continuar?"
      );
      if (!ok) return;
    }
    setGerando(true);
    setErro("");
    try {
      const res = await fetch("/api/app/integracoes/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseId, scope }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErro(data.message || "Erro ao gerar token.");
      } else {
        setNovoToken(data.data.token);
        onChanged();
      }
    } catch {
      setErro("Erro ao gerar token.");
    }
    setGerando(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">{titulo}</h3>
            {status.existe ? (
              <Badge variant={status.ativo ? "green" : "gray"}>{status.ativo ? "Ativo" : "Inativo"}</Badge>
            ) : (
              <Badge variant="gray">Não configurado</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">{descricao}</p>
          {status.existe && (
            <p className="text-xs text-slate-400 mt-2">
              Gerado em {formatData(status.criadoEm)} • Último uso: {formatData(status.ultimoUso)}
            </p>
          )}
        </div>
        <Button variant={status.existe ? "secondary" : "primary"} size="sm" onClick={gerar} disabled={gerando}>
          {status.existe ? <RefreshCw size={14} /> : <KeyRound size={14} />}
          {gerando ? "Gerando..." : status.existe ? "Regenerar token" : "Gerar token"}
        </Button>
      </div>

      {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

      {novoToken && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-2">
            <AlertTriangle size={14} />
            Copie agora — este token não será mostrado novamente
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
              {novoToken}
            </code>
            <CopyButton value={novoToken} />
          </div>
          <button
            type="button"
            className="text-xs text-amber-700 underline mt-2"
            onClick={() => setNovoToken(null)}
          >
            Já copiei, esconder
          </button>
        </div>
      )}

      {children}
    </Card>
  );
}
