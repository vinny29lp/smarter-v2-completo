#!/bin/bash
# ============================================================
#  BACKUP COMPLETO DO PROJETO smarter-v2-completo
#  Gera um arquivo .tar.gz com TODO o código (exceto node_modules, .next, logs).
#  Salva em: backups/smarter-v2-completo_AAAA-MM-DD_HH-MM-SS.tar.gz
# ============================================================

set -u

# Sempre executa a partir da pasta do projeto (independente de onde foi chamado)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR" || { echo "ERRO: não achei a pasta do projeto"; exit 1; }

TS=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="smarter-v2-completo_${TS}.tar.gz"
BACKUP_DIR="$PROJECT_DIR/backups"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
LOG="$PROJECT_DIR/logs/backup-${TS}.log"

mkdir -p "$BACKUP_DIR" "$PROJECT_DIR/logs"

echo "════════════════════════════════════════════════════════════"
echo "  BACKUP COMPLETO - smarter-v2-completo"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Origem  : $PROJECT_DIR"
echo "  Destino : $BACKUP_PATH"
echo "  Log     : $LOG"
echo ""
echo "  Excluindo:"
echo "    • node_modules/   (recuperável com npm install)"
echo "    • .next/          (build cache)"
echo "    • logs/           (logs antigos)"
echo "    • backups/        (backups antigos não entram no novo)"
echo "    • .DS_Store, .env (segredos)"
echo ""
read -p "  Continuar? [s/N]: " ok
case "$ok" in
  s|S|sim|y|Y) ;;
  *) echo "Cancelado."; exit 0 ;;
esac

echo "Início: $(date)" > "$LOG"
echo "Origem: $PROJECT_DIR" >> "$LOG"
echo "Destino: $BACKUP_PATH" >> "$LOG"
echo "" >> "$LOG"

# Estima tamanho aproximado
echo ""
echo "Calculando tamanho..."
SIZE_BEFORE=$(du -sh "$PROJECT_DIR" --exclude=node_modules --exclude=.next --exclude=backups 2>/dev/null | cut -f1)
echo "  Tamanho a comprimir: ~$SIZE_BEFORE"
echo ""
echo "Comprimindo... (pode demorar 1-3 minutos)"

# Tar com exclusões
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='logs/*.log' \
    --exclude='backups/*.tar.gz' \
    --exclude='.DS_Store' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.vercel' \
    --exclude='.env.production.local' \
    --exclude='.git/objects/pack' \
    -czf "$BACKUP_PATH" \
    -C "$(dirname "$PROJECT_DIR")" \
    "$(basename "$PROJECT_DIR")" 2>>"$LOG"

if [ $? -eq 0 ] && [ -f "$BACKUP_PATH" ]; then
  SIZE_AFTER=$(du -sh "$BACKUP_PATH" | cut -f1)
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  ✓ Backup criado com sucesso!"
  echo ""
  echo "  Arquivo  : $BACKUP_PATH"
  echo "  Tamanho  : $SIZE_AFTER"
  echo "  Log      : $LOG"
  echo ""
  echo "  Para restaurar este backup:"
  echo "    cd ~/Desktop/smarter"
  echo "    tar -xzf '$BACKUP_PATH'"
  echo "    cd smarter-v2-completo"
  echo "    npm install"
  echo "    npx prisma generate"
  echo "    npm run dev"
  echo ""
  echo "  Quer manter cópia em disco externo / nuvem? Recomendo!"
  echo "════════════════════════════════════════════════════════════"
  echo "Fim: $(date)" >> "$LOG"
  echo "Sucesso. Tamanho: $SIZE_AFTER" >> "$LOG"
else
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  ✗ ERRO ao criar backup!"
  echo "  Veja o log: $LOG"
  echo "════════════════════════════════════════════════════════════"
  echo "Fim: $(date) - COM ERROS" >> "$LOG"
fi

echo ""
read -p "Pressione ENTER para fechar..."
