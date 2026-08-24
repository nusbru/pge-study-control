#!/bin/sh
set -eu

attempt=1
max_attempts="${TEST_DATABASE_MAX_ATTEMPTS:-30}"

until printf 'SELECT 1;\n' | npx prisma db execute --stdin >/dev/null 2>&1; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    printf 'Test database did not accept SQL connections after %s attempts.\n' "$max_attempts" >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 1
done
