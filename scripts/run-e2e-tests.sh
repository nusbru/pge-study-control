#!/bin/sh
set -eu

export DATABASE_URL='postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test'
export AUTH_SECRET='test-only-auth-secret-at-least-32-characters'

trap 'docker compose -f compose.test.yaml down -v' EXIT
docker compose -f compose.test.yaml up -d --wait
sh scripts/wait-for-test-database.sh
npx prisma migrate deploy
printf 'SELECT 1 FROM "_prisma_migrations" LIMIT 1;\n' | npx prisma db execute --stdin >/dev/null
npx prisma db execute --stdin <<'SQL'
TRUNCATE TABLE "study_sessions", "users" CASCADE;
SQL
PLAYWRIGHT_REUSE_EXISTING_SERVER=0 npx playwright test "$@"
