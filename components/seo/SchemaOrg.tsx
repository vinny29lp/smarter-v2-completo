/**
 * SchemaOrg.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente de schemas JSON-LD para rich results no Google.
 *
 * Inclui:
 *  • Organization       → painel de conhecimento da empresa no Google
 *  • LocalBusiness      → resultado de "estágio perto de mim" / Google Maps
 *  • Service            → snippet de serviço nos resultados de busca
 *  • FAQPage            → FAQ em destaque direto na SERP (rich result)
 *
 * Uso: importar em app/layout.tsx dentro de <head>
 *   import { SchemaOrg } from "@/components/seo/SchemaOrg";
 *   ...
 *   <head><SchemaOrg /></head>
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BASE_URL = "https://smarterestagios.com.br";

// ── Organization ─────────────────────────────────────────────────────────────
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Smarter Estágios",
  alternateName: "Smarter",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  description:
    "Agente de integração de estágios que conecta empresas a estagiários qualificados com agilidade, conformidade legal e gestão digital completa.",
  foundingDate: "2023",
  address: {
    "@type": "PostalAddress",
    addressCountry: "BR",
    addressRegion: "SP",
    addressLocality: "São Paulo",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: "Portuguese",
      url: `${BASE_URL}/lead`,
    },
  ],
  sameAs: [
    // Adicione aqui os perfis oficiais da Smarter quando existirem:
    // "https://www.linkedin.com/company/smarter-estagios",
    // "https://www.instagram.com/smarter.estagios",
  ],
};

// ── LocalBusiness ────────────────────────────────────────────────────────────
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${BASE_URL}/#localbusiness`,
  name: "Smarter Estágios",
  image: `${BASE_URL}/og-image.png`,
  url: BASE_URL,
  description:
    "Agente de integração credenciado — intermediamos a contratação de estagiários para empresas de todos os tamanhos, garantindo conformidade com a Lei nº 11.788/2008.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "BR",
    addressRegion: "SP",
    addressLocality: "São Paulo",
  },
  priceRange: "$$",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
};

// ── Service ──────────────────────────────────────────────────────────────────
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Agente de Integração de Estágios",
  name: "Gestão Completa de Estágios",
  description:
    "Serviço completo de agenciamento de estágios: recrutamento e triagem de candidatos, elaboração e gestão de contratos digitais, acompanhamento de frequência e avaliações, conformidade com a Lei do Estágio.",
  provider: {
    "@type": "Organization",
    name: "Smarter Estágios",
    url: BASE_URL,
  },
  areaServed: {
    "@type": "Country",
    name: "Brasil",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Planos Smarter",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Plano para Empresas",
          description:
            "Acesso à triagem inteligente de estagiários, geração automática de contratos e painel de acompanhamento.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Portal do Estudante",
          description:
            "Cadastro gratuito, candidatura a vagas, acompanhamento de estágio e emissão de documentos.",
        },
      },
    ],
  },
};

// ── FAQPage ──────────────────────────────────────────────────────────────────
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O que é um agente de integração de estágios?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O agente de integração é a empresa credenciada que faz a intermediação entre a instituição de ensino, o estudante e a empresa contratante, garantindo que o estágio esteja em conformidade com a Lei nº 11.788/2008 (Lei do Estágio). A Smarter Estágios é um agente de integração que digitaliza e automatiza todo esse processo.",
      },
    },
    {
      "@type": "Question",
      name: "Como a Smarter Estágios ajuda as empresas a contratar estagiários?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Smarter oferece uma plataforma completa: triagem inteligente de candidatos por área e perfil, geração automática de contratos de estágio, acompanhamento de frequência e avaliações, e suporte jurídico para manter a conformidade com a Lei do Estágio — tudo em um único painel digital.",
      },
    },
    {
      "@type": "Question",
      name: "Como um estudante pode encontrar vagas de estágio na Smarter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O estudante se cadastra gratuitamente no portal da Smarter Estágios, preenche seu perfil acadêmico e pode se candidatar às vagas disponíveis por área, cidade e modalidade (presencial, híbrido ou remoto). Após selecionado, todo o processo de documentação e contrato é feito digitalmente pela plataforma.",
      },
    },
    {
      "@type": "Question",
      name: "A Smarter Estágios atende em todo o Brasil?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. A Smarter Estágios opera de forma 100% digital, atendendo empresas e estudantes em todo o território nacional. Nosso sistema permite gerenciar contratos, documentos e acompanhamento de estágio remotamente, independente do estado ou cidade.",
      },
    },
    {
      "@type": "Question",
      name: "Quais documentos são necessários para formalizar um estágio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Para formalizar um estágio são necessários: Termo de Compromisso de Estágio (TCE) assinado por empresa, estudante e instituição de ensino; Plano de Atividades; comprovante de matrícula atualizado; e seguro contra acidentes pessoais. A Smarter automatiza a geração e coleta de assinaturas de todos esses documentos.",
      },
    },
  ],
};

// ── Componente ────────────────────────────────────────────────────────────────
export function SchemaOrg() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
