#!/bin/sh
set -eu

COMPOSE_PROJECT_NAME="pge-e2e-$(date +%s)-$$"
TEST_DB_PORT=0
export COMPOSE_PROJECT_NAME TEST_DB_PORT
export AUTH_SECRET='test-only-auth-secret-at-least-32-characters'
cleanup_required=0

cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ "$cleanup_required" -eq 1 ]; then
    docker compose -f compose.test.yaml down -v >/dev/null 2>&1 || :
  fi
  exit "$status"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

cleanup_required=1
docker compose -f compose.test.yaml up -d --wait
database_mapping=$(docker compose -f compose.test.yaml port db-test 5432)
case $database_mapping in
  127.0.0.1:*) ;;
  *) printf '%s\n' 'Test database is not bound to the IPv4 loopback interface.' >&2; exit 1 ;;
esac
database_port=${database_mapping#127.0.0.1:}
case $database_port in
  '' | *[!0-9]*) printf '%s\n' 'Could not discover the test database port.' >&2; exit 1 ;;
esac
export DATABASE_URL="postgresql://pge:pge_test_only@127.0.0.1:$database_port/pge_test"
sh scripts/wait-for-test-database.sh
npx prisma migrate deploy
printf 'SELECT 1 FROM "_prisma_migrations" LIMIT 1;\n' | npx prisma db execute --stdin >/dev/null
npx prisma db execute --stdin <<'SQL'
TRUNCATE TABLE "study_sessions", "users" CASCADE;
SQL
PLAYWRIGHT_REUSE_EXISTING_SERVER=0 npx playwright test "$@"
