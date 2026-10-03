#!/usr/bin/env bash
# ====================================================================
# ARBORIS - SAFE ONLINE SQLITE BACKUP SCRIPT
# Uses SQLite Online Backup API to ensure 100% ACID consistency without
# locking readers or corrupting WAL journal files.
# ====================================================================

set -euo pipefail

DB_PATH="${1:-/var/www/arboris/database/arboris.sqlite}"
BACKUP_DIR="${2:-/var/backups/arboris}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/arboris_backup_${TIMESTAMP}.sqlite"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_PATH}" ]; then
    echo "[ERRO] Arquivo do banco de dados não encontrado em: ${DB_PATH}"
    exit 1
fi

echo "==> Iniciando backup online consistente..."
# sqlite3 .backup executes an online vacuumed copy respecting WAL locks
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Compress backup with gzip to minimize disk space
gzip -9 "${BACKUP_FILE}"
echo "==> Backup concluído com sucesso: ${BACKUP_FILE}.gz"

# Retain backups for 14 days, delete older ones
find "${BACKUP_DIR}" -name "arboris_backup_*.sqlite.gz" -type f -mtime +14 -delete
echo "==> Limpeza de backups antigos (>14 dias) executada."
