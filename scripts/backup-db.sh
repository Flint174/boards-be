#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
CONTAINER="boards-postgres"
RETENTION_DAYS=7

if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "ERROR: .env not found at $PROJECT_DIR/.env"
  exit 1
fi

set -a
source "$PROJECT_DIR/.env"
set +a

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-boards}"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)
FILENAME="backup-${DATE}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

echo "✅ Backup saved: $BACKUP_DIR/$FILENAME"

find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
