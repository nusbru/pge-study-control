#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"
COMPOSE_PROJECT_NAME="pge-identity-e2e-$(date +%s)-$$"
TEST_API_PORT=0
export COMPOSE_PROJECT_NAME TEST_API_PORT
cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ "$status" -ne 0 ]; then docker compose -f compose.test.yaml logs --no-color api migrate >&2 || :; fi
  docker compose -f compose.test.yaml down -v >/dev/null 2>&1 || :
  exit "$status"
}
trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
docker compose -f compose.test.yaml up -d --build --wait
mapping=$(docker compose -f compose.test.yaml port api 8080)
case "$mapping" in
  127.0.0.1:*) ;;
  *) printf '%s\n' 'Test API must bind to IPv4 loopback.' >&2; exit 1 ;;
esac
API_INTERNAL_URL="http://$mapping"
export API_INTERNAL_URL
node scripts/wait-for-api.mjs "$API_INTERNAL_URL"
npm run build
PLAYWRIGHT_REUSE_EXISTING_SERVER=0 npx playwright test "$@"
