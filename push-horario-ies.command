#!/bin/bash
cd "/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"

# Remove lock files se existirem de processo crashado
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null

git add components/forms/ContratoForm.tsx \
        lib/services/documentService.ts \
        lib/documents/types.ts \
        lib/documents/templates.ts \
        app/dashboard/ies/page.tsx \
        "app/dashboard/ies/[id]/page.tsx" \
        app/dashboard/ies/novo/page.tsx

git commit -m "feat: horario personalizado redesign (blocos De/Ate) + IES convenio/convite

- ContratoForm: substituiu turnos livres por blocos estruturados (de/ate/inicio/fim/intervalo)
  com dropdowns De/Ate por dia, calculo em tempo real, totalizador semanal
  e alertas de 6h/dia e 30h/semana (Lei 11.788/2008)
- documentService: suporta novo formato JSON {de,ate,inicio,fim,intervalo}
  alem dos formatos legados; calcula chDiaria por dia para TCE/Plano
- types.ts: adiciona chDiaria por entrada no array horarios
- templates.ts: schTable usa chDiaria por dia quando disponivel
- IES detail page: botoes Reenviar convite e Acompanhar convenios no header
- IES list page: le ?aba=acompanhamento da URL para abrir aba correta
- IES novo page: auto-preenche form via ?iesId= com dados da IES"

git push origin main
echo ""
echo "Push concluido com sucesso!"
