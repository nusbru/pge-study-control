#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/compose.dev.yaml"
COMPOSE_PROJECT_NAME=pge-local
LOCAL_DB_PORT=${LOCAL_DB_PORT:-5433}
APP_PORT=${APP_PORT:-3000}
DATABASE_URL=${DATABASE_URL:-"postgresql://pge:pge_local_only@127.0.0.1:$LOCAL_DB_PORT/pge_local"}
AUTH_SECRET=${AUTH_SECRET:-local-development-secret-at-least-32-characters}
export LOCAL_DB_PORT APP_PORT DATABASE_URL AUTH_SECRET
cleanup_required=0
app_pid=
signal_status=

cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ -n "$app_pid" ] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid" 2>/dev/null || :
    wait "$app_pid" 2>/dev/null || :
  fi
  if [ "$cleanup_required" -eq 1 ]; then
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down >/dev/null 2>&1 || :
  fi
  exit "$status"
}

forward_signal() {
  signal_status=$2
  if [ -n "$app_pid" ]; then
    kill -"$1" "$app_pid" 2>/dev/null || :
  else
    exit "$signal_status"
  fi
}

trap cleanup 0
trap 'forward_signal HUP 129' HUP
trap 'forward_signal INT 130' INT
trap 'forward_signal TERM 143' TERM

cd "$ROOT_DIR"
if [ ! -d node_modules ]; then
  npm ci
fi

cleanup_required=1
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d --wait
npm exec -- prisma migrate deploy
npm run dev -- --port "$APP_PORT" &
app_pid=$!

while :; do
  set +e
  wait "$app_pid"
  app_status=$?
  set -e
  if [ -n "$signal_status" ] && kill -0 "$app_pid" 2>/dev/null; then
    continue
  fi
  break
done

if [ -n "$signal_status" ]; then
  exit "$signal_status"
fi
exit "$app_status"
