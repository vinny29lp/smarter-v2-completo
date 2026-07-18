"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Plug } from "lucide-react";
import { isIntegracoesAdmin } from "@/lib/integracoes-auth";
import { ScopeTokenCard, type TokenStatus } from "@/components/integracoes/ScopeTokenCard";
import { EmpresaIdList, type EmpresaOpcao } from "@/components/integracoes/EmpresaIdList";

interface Unidade {
  id: string;
  name: string;
  cidade: string;
  uf: string;
}

interface StatusData {
  franchise: { id: string; name: string };
  crm: TokenStatus;
  recruitment: TokenStatus;
  marketing: TokenStatus;
  empresas: EmpresaOpcao[];
}

export default function IntegracoesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = isIntegracoesAdmin(session);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [franchiseId, setFranchiseId] = useState<string>("");
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Admin: carrega lista de unidades e seleciona a primeira por padrão
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !isAdmin) return;
    fetch("/api/app/integracoes/unidades")
      .then(r => r.json())
      .then(d => {
        const lista: Unidade[] = d.data?.unidades || [];
        setUnidades(lista);
        setFranchiseId(prev => prev || lista[0]?.id || "");
      });
  }, [sessionStatus, isAdmin]);

  // Não-admin: usa a própria unidade
  useEffect(() => {
    if (sessionStatus !== "authenticated" || isAdmin) return;
    if (session?.user?.franchiseId) setFranchiseId(session.user.franchiseId);
  }, [sessionStatus, isAdmin, session?.user?.franchiseId]);

  const carregarStatus = useMemo(() => {
    return async (fid: string) => {
      if (!fid) return;
      setLoading(true);
      setErro("");
      try {
        const res = await fetch(`/api/app/integracoes?franchiseId=${encodeURIComponent(fid)}`);
        const d = await res.json();
        if (!res.ok || !d.success) {
          setErro(d.message || "Erro ao carregar integração.");
          setData(null);
        } else {
          setData(d.data);
        }
      } catch {
        setErro("Erro ao carregar integração.");
      }
      setLoading(false);
    };
  }, []);

  useEffect(() => {
    if (franchiseId) carregarStatus(franchiseId);
  }, [franchiseId, carregarStatus]);

  if (sessionStatus === "loading") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Plug size={20} /> Integração
          </h2>
          <p className="text-sm text-slate-500">
            Tokens para conectar {isAdmin ? "as unidades da rede" : "sua unidade"} ao AI Workforce OS / Alizo.
          </p>
        </div>

        {isAdmin && unidades.length > 0 && (
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700"
            value={franchiseId}
            onChange={e => setFranchiseId(e.target.value)}
          >
            {unidades.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.cidade}/{u.uf}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-16 text-slate-400">Carregando...</div>
      ) : erro ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-red-500">{erro}</div>
      ) : data ? (
        <div className="space-y-4">
          <ScopeTokenCard
            titulo="CRM de Vendas"
            descricao='Cole este token no campo "Token do CRM da Smarter" na configuração da unidade dentro da Alizo. Ele autoriza o agente de vendas a criar e atualizar leads no CRM desta unidade.'
            scope="crm"
            franchiseId={data.franchise.id}
            status={data.crm}
            onChanged={() => carregarStatus(data.franchise.id)}
          />

          <ScopeTokenCard
            titulo="Recrutamento"
            descricao='Cole este token no campo "Token de Recrutamento da Smarter" na configuração da unidade dentro da Alizo. Ele autoriza o agente de RH a abrir vagas e inscrever candidatos nos processos seletivos desta unidade.'
            scope="recruitment"
            franchiseId={data.franchise.id}
            status={data.recruitment}
            onChanged={() => carregarStatus(data.franchise.id)}
          >
            <EmpresaIdList empresas={data.empresas} />
          </ScopeTokenCard>

          <ScopeTokenCard
            titulo="Tráfego Pago"
            descricao="Cole este token no campo de integração de Tráfego Pago dentro da Alizo. Ele autoriza o agente de tráfego a registrar e atualizar campanhas (Meta/Google Ads) desta unidade."
            scope="marketing"
            franchiseId={data.franchise.id}
            status={data.marketing}
            onChanged={() => carregarStatus(data.franchise.id)}
          />
        </div>
      ) : null}
    </div>
  );
}
