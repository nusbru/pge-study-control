#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM
FAKE_BIN="$TMP_DIR/bin"
mkdir "$FAKE_BIN"

cat > "$FAKE_BIN/docker" <<'SH'
#!/bin/sh
set -eu
printf 'docker|%s|%s|%s\n' "${COMPOSE_PROJECT_NAME-}" "${TEST_DB_PORT-}" "$*" >> "$HARNESS_LOG"
case " $* " in
  *' port db-test 5432 '*)
    case ${COMPOSE_PROJECT_NAME-} in
      *-e2e-*) printf '%s\n' '127.0.0.1:55432' ;;
      *) printf '%s\n' '127.0.0.1:55433' ;;
    esac
    ;;
esac
SH
chmod 755 "$FAKE_BIN/docker"

cat > "$FAKE_BIN/npx" <<'SH'
#!/bin/sh
set -eu
printf 'npx|%s|%s|%s\n' "${COMPOSE_PROJECT_NAME-}" "${DATABASE_URL-}" "$*" >> "$HARNESS_LOG"
if [ "${FAKE_FAIL_COMMAND-}" = "${1-}" ]; then
  exit 37
fi
exit 0
SH
chmod 755 "$FAKE_BIN/npx"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

HARNESS_LOG="$TMP_DIR/concurrent.log"
export HARNESS_LOG
TEST_DB_PORT=5433 PATH="$FAKE_BIN:$PATH" sh "$ROOT_DIR/scripts/run-integration-tests.sh" >"$TMP_DIR/integration.out" 2>"$TMP_DIR/integration.err" &
integration_pid=$!
TEST_DB_PORT=5433 PATH="$FAKE_BIN:$PATH" sh "$ROOT_DIR/scripts/run-e2e-tests.sh" --list >"$TMP_DIR/e2e.out" 2>"$TMP_DIR/e2e.err" &
e2e_pid=$!
wait "$integration_pid" || fail 'runner de integracao falhou com comandos controlados'
wait "$e2e_pid" || fail 'runner E2E falhou com comandos controlados'

integration_project=
e2e_project=
integration_url=
e2e_url=
integration_down=0
e2e_down=0
while IFS='|' read -r command project value arguments; do
  case $project in
    pge-integration-*) integration_project=$project ;;
    pge-e2e-*) e2e_project=$project ;;
  esac
  if [ "$command" = npx ]; then
    case $project in
      pge-integration-*) integration_url=$value ;;
      pge-e2e-*) e2e_url=$value ;;
    esac
  fi
  if [ "$command" = docker ] && [ "$value" != 0 ]; then
    fail 'runner repassou porta fixa herdada ao Docker'
  fi
  if [ "$command" = docker ] && [ "$value" = 0 ]; then
    case $arguments in
      *' down -v')
        case $project in
          pge-integration-*) integration_down=$((integration_down + 1)) ;;
          pge-e2e-*) e2e_down=$((e2e_down + 1)) ;;
        esac
        ;;
    esac
  fi
done < "$HARNESS_LOG"

[ -n "$integration_project" ] || fail 'runner de integracao nao definiu projeto unico'
[ -n "$e2e_project" ] || fail 'runner E2E nao definiu projeto unico'
[ "$integration_project" != "$e2e_project" ] || fail 'runners compartilharam o projeto Compose'
[ "$integration_url" = 'postgresql://pge:pge_test_only@127.0.0.1:55433/pge_test' ] || fail 'integracao nao exportou a porta descoberta'
[ "$e2e_url" = 'postgresql://pge:pge_test_only@127.0.0.1:55432/pge_test' ] || fail 'E2E nao exportou a porta descoberta'
[ "$integration_down" -eq 1 ] || fail 'integracao nao limpou exatamente seu projeto'
[ "$e2e_down" -eq 1 ] || fail 'E2E nao limpou exatamente seu projeto'

HARNESS_LOG="$TMP_DIR/failure.log"
export HARNESS_LOG
set +e
FAKE_FAIL_COMMAND=vitest TEST_DB_PORT=5433 PATH="$FAKE_BIN:$PATH" sh "$ROOT_DIR/scripts/run-integration-tests.sh" >"$TMP_DIR/failure.out" 2>"$TMP_DIR/failure.err"
failure_status=$?
set -e
[ "$failure_status" -eq 37 ] || fail 'runner nao preservou o status do teste'
failure_down=0
while IFS='|' read -r command project value arguments; do
  if [ "$command" = docker ] && [ "$value" != 0 ]; then
    fail 'runner com falha repassou porta fixa herdada ao Docker'
  fi
  if [ "$command" = docker ] && [ -n "$project" ]; then
    case $arguments in
      *' down -v') failure_down=$((failure_down + 1)) ;;
    esac
  fi
done < "$HARNESS_LOG"
[ "$failure_down" -eq 1 ] || fail 'runner com falha nao limpou exatamente seu projeto'

printf '%s\n' 'PASS: runners isolam projeto, porta, status e limpeza'
