#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/compose.dev.yaml"
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-pge-local}
LOCAL_DB_PORT=${LOCAL_DB_PORT:-5433}
APP_PORT=${APP_PORT:-3000}
API_PORT=${API_PORT:-5080}
LOCAL_UID=${LOCAL_UID:-$(id -u)}
LOCAL_GID=${LOCAL_GID:-$(id -g)}
export LOCAL_DB_PORT APP_PORT API_PORT LOCAL_UID LOCAL_GID
cleanup_required=0
command_pid=

cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ -n "$command_pid" ] && kill -0 "$command_pid" 2>/dev/null; then
    kill -TERM "$command_pid" 2>/dev/null || :
    wait "$command_pid" 2>/dev/null || :
  fi
  if [ "$cleanup_required" -eq 1 ]; then
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down >/dev/null 2>&1 || :
  fi
  exit "$status"
}

run_compose() {
  # Waiting on an owned CLI process keeps signal traps responsive even during a build.
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" "$@" &
  command_pid=$!
  if wait "$command_pid"; then
    command_status=0
  else
    command_status=$?
  fi
  command_pid=
  return "$command_status"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$ROOT_DIR"
# Create mountpoints as the host user rather than letting Docker create root-owned directories.
mkdir -p node_modules .next
cleanup_required=1
run_compose up -d --build --wait
printf '\nPGE Study: http://localhost:%s\nCtrl+C encerra os containers e preserva os volumes.\n\n' "$APP_PORT"
run_compose logs --follow --tail=50 app api
