#!/bin/sh
set -eu

docker compose -f compose.test.yaml up -d --wait
trap 'docker compose -f compose.test.yaml down -v' EXIT
export DATABASE_URL='postgresql://pge:pge_test_only@localhost:5433/pge_test'
npx prisma migrate deploy
npx vitest run --config vitest.integration.config.ts "$@"
