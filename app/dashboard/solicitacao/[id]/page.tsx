import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function SolicitacaoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  // Apenas FRANQUEADO e FUNCIONARIO podem acessar
  if (role !== "FRANQUEADO" && role !== "FUNCIONARIO") {
    redirect("/dashboard");
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) notFound();

  // Garante que só o destinatário veja
  if ((notification as any).userId !== (session.user as any).id) {
    redirect("/dashboard");
  }

  const dt = new Date(notification.createdAt ?? new Date());

  // Marcar como lida
  await prisma.notification.update({
    where: { id: params.id },
    data: { lida: true },
  });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          ← Voltar ao painel
        </Link>
        <a
          href={`/api/app/notificacao/${params.id}/pdf`}
          target="_blank"
          className="text-sm bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-bold"
        >
          📄 Baixar PDF
        </a>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Solicitação de Estagiário
          </span>
          <span className="text-[11px] text-slate-400">
            {dt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Título */}
        <h1 className="text-lg font-black text-slate-800 mb-4">{notification.titulo}</h1>

        {/* Conteúdo */}
        <div className="bg-slate-50 rounded-lg p-4 border">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
            {notification.mensagem}
          </pre>
        </div>

        {/* Rodapé */}
        {notification.link && (
          <div className="mt-5 pt-4 border-t flex gap-3">
            <Link
              href={notification.link}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              Ver empresa →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
