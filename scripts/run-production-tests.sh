#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"
temporary_directory=$(mktemp -d)
PRODUCTION_TEST_ENV_FILE="$temporary_directory/production.env"
COMPOSE_PROJECT_NAME="pge-identity-production-test-$(date +%s)-$$"
APP_PORT=${PRODUCTION_TEST_PORT:-3141}
export PRODUCTION_TEST_ENV_FILE COMPOSE_PROJECT_NAME APP_PORT
cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ -f "$PRODUCTION_TEST_ENV_FILE" ]; then
    if [ "$status" -ne 0 ]; then docker compose --env-file "$PRODUCTION_TEST_ENV_FILE" logs --no-color app api >&2 || :; fi
    docker compose --env-file "$PRODUCTION_TEST_ENV_FILE" down -v >/dev/null 2>&1 || :
  fi
  rm -rf "$temporary_directory"
  exit "$status"
}
trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
./scripts/generate-production-env.sh .env.example "$PRODUCTION_TEST_ENV_FILE"
docker compose --env-file "$PRODUCTION_TEST_ENV_FILE" up -d --build --wait
npx playwright test --config playwright.production.config.ts "$@"
