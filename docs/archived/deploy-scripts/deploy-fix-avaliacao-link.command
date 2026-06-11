#!/bin/bash
cd "$(dirname "$0")"
echo "=== Removendo lock files ==="
rm -f .git/HEAD.lock .git/index.lock
echo "=== Adicionando arquivos ==="
git add \
  app/api/app/contratos/\[id\]/enviar-avaliacao/route.ts \
  lib/email.ts
echo "=== Status ==="
git status
echo "=== Commitando ==="
git commit -m "fix: link avaliação semestral — URL correta em produção

CAUSA RAIZ:
- .env commitado no git tinha NEXT_PUBLIC_APP_URL=http://localhost:3000
- Route handler usava essa variável diretamente, gerando link http://localhost:3000/...
- Em produção o link do e-mail era inacessível

CORREÇÃO:
- app/api/app/contratos/[id]/enviar-avaliacao/route.ts
  Deriva URL base do próprio req.url (sempre correto em produção)
  Fallback: ignora localhost nos env vars, usa req.protocol+host

- lib/email.ts
  APP_URL agora ignora valores localhost no env
  Fallback seguro: https://sistema.smarterestagios.com.br

RESULTADO:
- Link no e-mail de avaliação aponta para o domínio real de produção
- Funciona em qualquer ambiente (dev usa localhost, prod usa domínio real)
- Fluxo completo: email → link → login (se necessário) → página avaliação → modal abre"
echo "=== Push para main ==="
git push origin main
echo "=== DONE ==="
read -p "Pressione Enter para fechar..."
