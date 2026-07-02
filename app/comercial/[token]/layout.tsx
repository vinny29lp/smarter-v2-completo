import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Smarter Estágios — Programa de Estágio para Empresas",
  description:
    "Contrate estagiários com segurança, agilidade e custo menor que uma contratação CLT. A Smarter Estágios cuida de toda a documentação, triagem e acompanhamento.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Smarter Estágios — Programa de Estágio para Empresas",
    description:
      "Processo 100% conforme a Lei nº 11.788/2008. Triagem, documentação, seguro e acompanhamento — a Smarter cuida de tudo.",
    siteName: "Smarter Estágios",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/assets/logo-smarter-white.png",
        width: 800,
        height: 200,
        alt: "Smarter Estágios",
      },
    ],
  },
};

export default function ComercialLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Schema.org: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Smarter Estágios",
            url: "https://sistema.smarterestagios.com.br",
            logo: "https://sistema.smarterestagios.com.br/assets/logo-smarter-white.png",
            description:
              "Agente de integração de estágios. Gestão completa do programa de estágio para empresas conforme a Lei nº 11.788/2008.",
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              availableLanguage: "Portuguese",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
