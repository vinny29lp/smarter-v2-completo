# Implementação de SEO Técnico — Smarter Estágios

**Data:** 08/06/2026  
**Sistema:** Next.js 13+ App Router  
**Domínio base:** `https://smarterestagios.com.br`

---

## ✅ O que foi implementado

### 1. `app/layout.tsx` — Metadata completo

Substituído o metadata básico por uma configuração completa de SEO:

| Campo | Valor |
|---|---|
| `title.default` | "Smarter Estágios \| Agente de Integração para Empresas e Estudantes" |
| `title.template` | `"%s \| Smarter Estágios"` |
| `description` | 160 chars otimizados com palavras-chave principais |
| `keywords` | 13 termos: estágio, estagiário, agente de integração, etc. |
| `openGraph` | type, locale, url, siteName, title, description, imagem 1200×630 |
| `twitter` | `summary_large_image` card |
| `robots` | `index: true`, `follow: true`, `max-snippet: -1` |
| `alternates.canonical` | `https://smarterestagios.com.br` |
| `verification.google` | placeholder `COLE_SEU_CODIGO_AQUI` |

**⚠️ Ação necessária:** Substitua `COLE_SEU_CODIGO_AQUI` pelo código do Google Search Console:
1. Acesse https://search.google.com/search-console
2. Adicionar propriedade → "Prefixo de URL" → `https://smarterestagios.com.br`
3. Escolha verificação por "Tag HTML"
4. Copie apenas o conteúdo do atributo `content` (ex: `abc123xyz`)
5. Cole no `app/layout.tsx` em `verification: { google: "abc123xyz" }`

---

### 2. `app/sitemap.ts` — Sitemap dinâmico

Criado arquivo que gera `/sitemap.xml` automaticamente via Next.js App Router.

URLs incluídas:

| URL | Frequência | Prioridade |
|---|---|---|
| `/` | weekly | 1.0 |
| `/lead` | weekly | 0.9 |
| `/vagas` | daily | 0.9 |
| `/portal-empresa` | weekly | 0.8 |
| `/portal-estudante` | weekly | 0.8 |
| `/cadastro` | monthly | 0.7 |
| `/login` | monthly | 0.5 |

**Para adicionar novas páginas:** edite `app/sitemap.ts` e acrescente entradas no array.

---

### 3. `app/robots.ts` — Robots.txt dinâmico

Criado arquivo que gera `/robots.txt` automaticamente.

- **Permite:** todas as rotas públicas `/`
- **Bloqueia:** `/api/`, `/app/`, `/admin/`, `/dashboard/`, `/portal-empresa/`, `/portal-estudante/`
- **Bloqueia bots de IA:** GPTBot, CCBot
- **Aponta sitemap:** `https://smarterestagios.com.br/sitemap.xml`

---

### 4. `components/seo/SchemaOrg.tsx` — Schemas JSON-LD

Criado componente com 4 schemas para rich results no Google:

#### Organization Schema
- Nome, logo, descrição, endereço, contato
- Painel de conhecimento da empresa no Google

#### LocalBusiness Schema
- Classificação de negócio local
- Endereço, horários de funcionamento, faixa de preço
- Melhora resultados para buscas "estágio perto de mim"

#### Service Schema
- Tipo de serviço: "Agente de Integração de Estágios"
- Área de atendimento: Brasil inteiro
- Catálogo de planos (Empresas e Estudantes)

#### FAQPage Schema
- 5 perguntas e respostas sobre estágios
- Aparece como rich result diretamente na SERP do Google
- Aumenta CTR sem ocupar posição adicional

---

### 5. `next.config.mjs` — Headers de segurança (já existiam)

Verificado — o projeto **já possui** todos os headers de segurança necessários:
- `X-Content-Type-Options: nosniff` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✅
- `Strict-Transport-Security` (HSTS) ✅
- `X-XSS-Protection` ✅
- CSP com nonce via middleware ✅

Nenhuma alteração necessária.

---

## 🚀 Deploy

### Commit realizado
```
feat(seo): implementação completa de SEO técnico
4 files changed, 400 insertions(+), 4 deletions(-)
```

### Para fazer o push:
1. Abra o Finder
2. Navegue até: `Desktop/Sistema smarter/smarter-v2-completo/.git/`
3. Delete o arquivo `HEAD.lock`
4. Volte para `smarter-v2-completo/`
5. Dê **duplo clique** em `push-agora.command`
6. Aguarde ~2 min para o Vercel fazer o deploy automático

---

## 🔍 Verificações pós-deploy

Após o deploy, verifique:

| O que verificar | URL |
|---|---|
| Sitemap gerado | `https://smarterestagios.com.br/sitemap.xml` |
| Robots.txt gerado | `https://smarterestagios.com.br/robots.txt` |
| Schemas JSON-LD | Inspecionar elemento → `<script type="application/ld+json">` |
| Rich results | https://search.google.com/test/rich-results |
| Open Graph | https://opengraph.xyz/ |
| Google Search Console | Enviar sitemap manualmente após verificação |

---

## 📋 Próximos passos recomendados

1. **Google Search Console:** Verificar propriedade (substituir código placeholder) e submeter sitemap
2. **Imagem OG:** Criar arquivo `/public/og-image.png` (1200×630px) com identidade visual da Smarter
3. **Metadata por página:** Adicionar `export const metadata` específico em cada página pública (vagas, lead, etc.)
4. **Core Web Vitals:** Monitorar LCP, FID e CLS no Google Search Console
5. **Google My Business:** Criar/reivindicar perfil da Smarter para reforçar o LocalBusiness schema
6. **Backlinks:** Buscar menções em sites de emprego e educação para aumentar autoridade de domínio
7. **Redes sociais:** Adicionar URLs reais dos perfis no `sameAs` do Organization schema quando criados

---

*Gerado automaticamente pela implementação de SEO técnico — Smarter Estágios*
