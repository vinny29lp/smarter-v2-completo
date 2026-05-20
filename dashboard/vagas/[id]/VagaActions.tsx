"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Props { vagaId: string; status: string; publicSlug?: string; titulo: string; }

export function VagaActions({ vagaId, status, publicSlug, titulo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const linkPublico = publicSlug ? `${base}/vaga/${publicSlug}` : null;

  const changeStatus = async (s: string) => {
    setLoading(true);
    await fetch(`/api/app/vagas/${vagaId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:s}),
    });
    router.refresh();
    setLoading(false);
  };

  const copy = () => {
    if (linkPublico) navigator.clipboard.writeText(linkPublico);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  return (
    <div className="space-y-2">
      {linkPublico && (
        <Button variant="secondary" className="w-full justify-center" onClick={()=>setLinkModal(true)}>
          🔗 Link de Divulgação
        </Button>
      )}
      {status === "ABERTA" && (
        <Button variant="secondary" className="w-full justify-center" onClick={()=>changeStatus("PAUSADA")} disabled={loading}>
          ⏸ Pausar Vaga
        </Button>
      )}
      {status === "PAUSADA" && (
        <Button className="w-full justify-center" onClick={()=>changeStatus("ABERTA")} disabled={loading}>
          ▶ Reabrir Vaga
        </Button>
      )}
      {status !== "ENCERRADA" && (
        <Button variant="danger" className="w-full justify-center" onClick={()=>changeStatus("ENCERRADA")} disabled={loading}>
          ✕ Encerrar Vaga
        </Button>
      )}
      {status === "ENCERRADA" && (
        <Button className="w-full justify-center" onClick={()=>changeStatus("ABERTA")} disabled={loading}>
          ↩ Reabrir
        </Button>
      )}

      <Modal open={linkModal} onClose={()=>setLinkModal(false)} title="Link de Divulgação da Vaga">
        <p className="text-sm text-slate-500 mb-3">Compartilhe este link para candidatos se inscreverem na vaga <strong>{titulo}</strong>:</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-4 select-all">{linkPublico}</div>
        <div className="flex gap-2">
          <Button onClick={copy} className="flex-1 justify-center">{copied?"✓ Copiado!":"📋 Copiar Link"}</Button>
          <Button variant="secondary" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent("Confira esta vaga de estágio: "+titulo+" — "+linkPublico)}`)}>
            📱 WhatsApp
          </Button>
        </div>
      </Modal>
    </div>
  );
}
