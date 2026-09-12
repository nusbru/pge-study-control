#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM
mkdir "$TMP_DIR/bin"
export HARNESS_LOG="$TMP_DIR/log"
cat > "$TMP_DIR/bin/docker" <<'SH'
#!/bin/sh
printf 'docker|%s|%s|%s\n' "$COMPOSE_PROJECT_NAME" "$TEST_API_PORT" "$*" >> "$HARNESS_LOG"
case " $* " in *' port api 8080 '*) printf '%s\n' '127.0.0.1:55432' ;; esac
SH
cat > "$TMP_DIR/bin/npm" <<'SH'
#!/bin/sh
printf 'npm|%s|%s\n' "$API_INTERNAL_URL" "$*" >> "$HARNESS_LOG"
SH
cat > "$TMP_DIR/bin/node" <<'SH'
#!/bin/sh
exit 0
SH
cat > "$TMP_DIR/bin/npx" <<'SH'
#!/bin/sh
printf 'npx|%s|%s|%s\n' "$API_INTERNAL_URL" "$PLAYWRIGHT_REUSE_EXISTING_SERVER" "$*" >> "$HARNESS_LOG"
exit "${FAKE_STATUS:-0}"
SH
cat > "$TMP_DIR/bin/dotnet" <<'SH'
#!/bin/sh
printf 'dotnet|%s\n' "$*" >> "$HARNESS_LOG"
exit "${FAKE_STATUS:-0}"
SH
chmod +x "$TMP_DIR/bin/"*
export PATH="$TMP_DIR/bin:$PATH"
sh "$ROOT_DIR/scripts/run-e2e-tests.sh" --list
grep -q 'npx|http://127.0.0.1:55432|0|playwright test --list' "$HARNESS_LOG"
grep -q 'npm|http://127.0.0.1:55432|run build' "$HARNESS_LOG"
grep -q 'docker|pge-identity-e2e-.*|0|compose -f compose.test.yaml down -v' "$HARNESS_LOG"
set +e
FAKE_STATUS=37 sh "$ROOT_DIR/scripts/run-e2e-tests.sh"
status=$?
set -e
[ "$status" -eq 37 ]
[ "$(grep -c 'down -v' "$HARNESS_LOG")" -eq 2 ]
set +e
FAKE_STATUS=38 sh "$ROOT_DIR/scripts/run-integration-tests.sh" --no-restore
status=$?
set -e
[ "$status" -eq 38 ]
grep -q 'dotnet|test .*PgeStudy.Integration.Tests --no-restore' "$HARNESS_LOG"
printf '%s\n' 'PASS: runners isolate the API, build the frontend, preserve status and clean up'
