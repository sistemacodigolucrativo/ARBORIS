#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DB_HOME="${HOME}/.cache/arboris-mysql"
DATA_DIR="${DB_HOME}/data"
SOCKET="${DB_HOME}/mysql.sock"
PID_FILE="${DB_HOME}/mysql.pid"
LOG_FILE="${DB_HOME}/mysql.log"
MYSQLD="$(command -v mysqld)"
MYSQL_BASE="$(dirname "$(dirname "$MYSQLD")")"
MYSQL_PID=""
API_PID=""
VITE_PID=""

stop_processes() {
  local status=$?
  trap - EXIT INT TERM
  for pid in "$VITE_PID" "$API_PID" "$MYSQL_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$VITE_PID" "$API_PID" "$MYSQL_PID"; do
    if [[ -n "$pid" ]]; then wait "$pid" 2>/dev/null || true; fi
  done
  exit "$status"
}
trap stop_processes EXIT INT TERM

mkdir -p "$DB_HOME" "$DATA_DIR"
if [[ ! -d "$DATA_DIR/mysql" ]]; then
  echo "Initializing the isolated local MySQL 8.4 development database."
  mysqld --initialize-insecure --user="$(id -un)" --basedir="$MYSQL_BASE" --datadir="$DATA_DIR"
fi

if ! mysqladmin --socket="$SOCKET" --user=root ping --silent >/dev/null 2>&1; then
  rm -f "$SOCKET" "$PID_FILE"
  mysqld \
    --user="$(id -un)" \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATA_DIR" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --bind-address=127.0.0.1 \
    --port=3306 \
    --mysqlx=0 \
    --log-error="$LOG_FILE" &
  MYSQL_PID=$!

  ready=false
  for _ in $(seq 1 45); do
    if mysqladmin --socket="$SOCKET" --user=root ping --silent >/dev/null 2>&1; then
      ready=true
      break
    fi
    if ! kill -0 "$MYSQL_PID" 2>/dev/null; then break; fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then
    echo "Local MySQL did not start. Recent database log:"
    tail -n 60 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi
fi

mysql --socket="$SOCKET" --user=root <<'SQL'
CREATE DATABASE IF NOT EXISTS arboris CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'arboris'@'127.0.0.1';
GRANT ALL PRIVILEGES ON arboris.* TO 'arboris'@'127.0.0.1';
SQL

export DATABASE_URL="mysql://arboris@127.0.0.1:3306/arboris"
export NODE_ENV=development
export ARBORIS_VISUAL_PREVIEW=true
export PORT=3001
export HOST=127.0.0.1
if [[ -n "${REPLIT_DEV_DOMAIN:-}" ]]; then
  PREVIEW_ORIGIN="https://${REPLIT_DEV_DOMAIN}"
else
  PREVIEW_ORIGIN="http://localhost:5000"
fi
export APP_ORIGINS="${PREVIEW_ORIGIN},http://localhost:5000,http://127.0.0.1:5000,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

npm run db:migrate
if [[ -z "$(mysql --socket="$SOCKET" --user=root --database=arboris --batch --skip-column-names --execute='SELECT id FROM game_config WHERE id=1 LIMIT 1')" ]]; then
  echo "Importing the repository demo data into the local development database (first run only)."
  npm run db:import
fi

if [[ -n "${ARBORIS_DEV_ADMIN_PASSWORD:-}" ]]; then
  echo "Provisioning the local-only admin account from Replit Secrets."
  ACCOUNT_USERNAME=admin ACCOUNT_PASSWORD="$ARBORIS_DEV_ADMIN_PASSWORD" npm run db:password
fi

npm run api:start &
API_PID=$!
api_ready=false
for _ in $(seq 1 45); do
  if curl --fail --silent http://127.0.0.1:3001/api/health >/dev/null; then
    api_ready=true
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then break; fi
  sleep 1
done
if [[ "$api_ready" != true ]]; then
  echo "The local API did not become ready."
  exit 1
fi

echo "ARBORIS preview ready; Vite HMR is enabled and the local MySQL database is isolated from production."
DISABLE_HMR=false npm run dev -- --host 0.0.0.0 --port 5000 --strictPort &
VITE_PID=$!

children=("$API_PID" "$VITE_PID")
if [[ -n "$MYSQL_PID" ]]; then children+=("$MYSQL_PID"); fi
wait -n "${children[@]}"
