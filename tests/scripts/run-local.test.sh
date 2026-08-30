#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM
FAKE_BIN="$TMP_DIR/bin"
mkdir "$FAKE_BIN"

cat > "$FAKE_BIN/npm" <<'SH'
#!/bin/sh
set -eu
printf 'npm|%s|%s|%s|%s|%s\n' \
  "${LOCAL_DB_PORT-}" "${APP_PORT-}" "${DATABASE_URL-}" "${AUTH_SECRET-}" "$*" \
  >> "$HARNESS_LOG"
if [ "$*" = "${FAKE_WAIT_ARGS-}" ]; then
  printf '%s\n' "$$" > "$NPM_PID_FILE"
  trap 'printf "%s\n" HUP > "$NPM_SIGNAL_LOG"' HUP
  trap 'printf "%s\n" INT > "$NPM_SIGNAL_LOG"' INT
  trap 'printf "%s\n" TERM > "$NPM_SIGNAL_LOG"' TERM
  signal-waiter &
  child_pid=$!
  while :; do
    set +e
    wait "$child_pid"
    child_status=$?
    set -e
    if kill -0 "$child_pid" 2>/dev/null; then
      continue
    fi
    exit "$child_status"
  done
fi
if [ "$*" = "${FAKE_FAIL_ARGS-}" ]; then
  exit "${FAKE_FAIL_STATUS:-37}"
fi
SH
chmod 755 "$FAKE_BIN/npm"

cat > "$FAKE_BIN/signal-waiter" <<'JS'
#!/usr/bin/env node
const { writeFileSync } = require('node:fs');

writeFileSync(process.env.APP_PID_FILE, `${process.pid}\n`);
for (const [signal, status] of [['SIGHUP', 129], ['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    writeFileSync(process.env.APP_SIGNAL_LOG, `${signal.slice(3)}\n`);
    process.exit(status);
  });
}
setInterval(() => {}, 1000);
JS
chmod 755 "$FAKE_BIN/signal-waiter"

cat > "$FAKE_BIN/signal-launcher" <<'JS'
#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { writeFileSync } = require('node:fs');

const child = spawn(process.argv[2], process.argv.slice(3), {
  env: process.env,
  stdio: 'inherit',
});
writeFileSync(process.env.RUNNER_PID_FILE, `${child.pid}\n`);
child.on('error', () => process.exit(1));
child.on('exit', (status) => process.exit(status === null ? 1 : status));
JS
chmod 755 "$FAKE_BIN/signal-launcher"

cat > "$FAKE_BIN/docker" <<'SH'
#!/bin/sh
set -eu
printf 'docker|%s|%s|%s|%s|%s\n' \
  "${LOCAL_DB_PORT-}" "${APP_PORT-}" "${DATABASE_URL-}" "${AUTH_SECRET-}" "$*" \
  >> "$HARNESS_LOG"
case $* in
  *' up -d --wait') [ -z "${FAKE_COMPOSE_UP_STATUS-}" ] || exit "$FAKE_COMPOSE_UP_STATUS" ;;
  *' down') [ -z "${FAKE_COMPOSE_DOWN_STATUS-}" ] || exit "$FAKE_COMPOSE_DOWN_STATUS" ;;
esac
SH
chmod 755 "$FAKE_BIN/docker"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

prepare_project() {
  project=$1
  mkdir -p "$project/scripts"
  cp "$ROOT_DIR/scripts/run-local.sh" "$project/scripts/run-local.sh"
  if [ -e "$ROOT_DIR/scripts/run-local-app.mjs" ]; then
    cp "$ROOT_DIR/scripts/run-local-app.mjs" "$project/scripts/run-local-app.mjs"
  fi
  cp "$ROOT_DIR/compose.dev.yaml" "$project/compose.dev.yaml"
}

wait_for_file() {
  wait_file=$1
  wait_attempt=0
  while [ ! -s "$wait_file" ]; do
    wait_attempt=$((wait_attempt + 1))
    [ "$wait_attempt" -lt 50 ] || return 1
    sleep 0.1
  done
}

log_has_down() {
  while IFS='|' read -r logged_command _ _ _ _ logged_arguments; do
    if [ "$logged_command" = docker ]; then
      case $logged_arguments in
        *' down'|*' down '*) return 0 ;;
      esac
    fi
  done < "$1"
  return 1
}

wait_for_down() {
  wait_log=$1
  wait_attempt=0
  while ! log_has_down "$wait_log"; do
    wait_attempt=$((wait_attempt + 1))
    [ "$wait_attempt" -lt 50 ] || return 1
    sleep 0.1
  done
}

run_signal_scenario() {
  signal_name=$1
  expected_status=$2
  signal_project="$TMP_DIR/signal-$signal_name-project"
  prepare_project "$signal_project"
  mkdir "$signal_project/node_modules"
  signal_log="$TMP_DIR/signal-$signal_name.log"
  npm_pid_file="$TMP_DIR/signal-$signal_name.npm.pid"
  npm_signal_log="$TMP_DIR/signal-$signal_name.npm.received"
  app_pid_file="$TMP_DIR/signal-$signal_name.pid"
  app_signal_log="$TMP_DIR/signal-$signal_name.received"
  runner_pid_file="$TMP_DIR/signal-$signal_name.runner"

  HARNESS_LOG="$signal_log" \
  NPM_PID_FILE="$npm_pid_file" \
  NPM_SIGNAL_LOG="$npm_signal_log" \
  APP_PID_FILE="$app_pid_file" \
  APP_SIGNAL_LOG="$app_signal_log" \
  RUNNER_PID_FILE="$runner_pid_file" \
  FAKE_WAIT_ARGS='run dev -- --port 3000' \
  PATH="$FAKE_BIN:$PATH" \
    signal-launcher sh "$signal_project/scripts/run-local.sh" &
  launcher_pid=$!

  if ! wait_for_file "$runner_pid_file" || ! wait_for_file "$npm_pid_file" || ! wait_for_file "$app_pid_file"; then
    if [ -s "$runner_pid_file" ]; then
      IFS= read -r runner_pid < "$runner_pid_file"
      kill -TERM "$runner_pid" 2>/dev/null || :
    fi
    if [ -s "$app_pid_file" ]; then
      IFS= read -r app_pid < "$app_pid_file"
      kill -TERM "$app_pid" 2>/dev/null || :
    fi
    if [ -s "$npm_pid_file" ]; then
      IFS= read -r npm_pid < "$npm_pid_file"
      kill -TERM "$npm_pid" 2>/dev/null || :
    fi
    kill -TERM "$launcher_pid" 2>/dev/null || :
    wait "$launcher_pid" 2>/dev/null || :
    fail "aplicacao nao iniciou antes do sinal $signal_name"
  fi
  IFS= read -r runner_pid < "$runner_pid_file"
  IFS= read -r npm_pid < "$npm_pid_file"
  IFS= read -r app_pid < "$app_pid_file"
  [ "$npm_pid" != "$app_pid" ] || fail "cenario $signal_name nao criou descendente distinto do npm"
  kill -"$signal_name" "$runner_pid"

  if ! wait_for_down "$signal_log"; then
    kill -TERM "$app_pid" 2>/dev/null || :
    wait "$launcher_pid" 2>/dev/null || :
    fail "sinal $signal_name nao acionou limpeza imediata"
  fi

  set +e
  wait "$launcher_pid"
  runner_status=$?
  set -e
  [ "$runner_status" -eq "$expected_status" ] || fail "sinal $signal_name retornou status $runner_status em vez de $expected_status"
  [ -e "$npm_signal_log" ] || fail "sinal $signal_name nao alcancou o processo npm"
  IFS= read -r npm_received_signal < "$npm_signal_log"
  [ "$npm_received_signal" = "$signal_name" ] || fail "npm recebeu $npm_received_signal em vez de $signal_name"
  [ -e "$app_signal_log" ] || fail "sinal $signal_name nao foi encaminhado para a aplicacao"
  IFS= read -r received_signal < "$app_signal_log"
  [ "$received_signal" = "$signal_name" ] || fail "sinal $signal_name foi encaminhado como $received_signal"
  if kill -0 "$app_pid" 2>/dev/null; then
    kill -KILL "$app_pid" 2>/dev/null || :
    fail "sinal $signal_name deixou o descendente da aplicacao orfao"
  fi
  if kill -0 "$npm_pid" 2>/dev/null; then
    kill -KILL "$npm_pid" 2>/dev/null || :
    fail "sinal $signal_name deixou o processo npm orfao"
  fi

  down_count=0
  while IFS='|' read -r logged_command _ _ _ _ logged_arguments; do
    if [ "$logged_command" = docker ]; then
      case $logged_arguments in
        *' down')
          down_count=$((down_count + 1))
          [ "$logged_arguments" = "compose -p pge-local -f $signal_project/compose.dev.yaml down" ] || fail "limpeza do sinal $signal_name recebeu argumentos incorretos"
          ;;
      esac
    fi
    case $logged_arguments in
      *' down -v'|*' down --volumes'*) fail "limpeza do sinal $signal_name tentou remover o volume" ;;
    esac
  done < "$signal_log"
  [ "$down_count" -eq 1 ] || fail "sinal $signal_name executou $down_count limpezas"
}

assert_failure_command() {
  failure_case=$1
  failure_line=$2
  failure_command=$3
  failure_arguments=$4
  failure_project=$5
  case "$failure_case:$failure_line" in
    compose-startup:1|migration:1|cleanup:1)
      [ "$failure_command|$failure_arguments" = "docker|compose -p pge-local -f $failure_project/compose.dev.yaml up -d --wait" ] || fail "$failure_case executou Compose up incorretamente"
      ;;
    compose-startup:2|migration:3|cleanup:4)
      [ "$failure_command|$failure_arguments" = "docker|compose -p pge-local -f $failure_project/compose.dev.yaml down" ] || fail "$failure_case nao encerrou com Compose down seguro"
      ;;
    migration:2|cleanup:2)
      [ "$failure_command|$failure_arguments" = 'npm|exec -- prisma migrate deploy' ] || fail "$failure_case nao executou a migracao na ordem esperada"
      ;;
    cleanup:3)
      [ "$failure_command|$failure_arguments" = 'npm|run dev -- --port 3000' ] || fail 'falha da aplicacao ocorreu no comando incorreto'
      ;;
    *) fail "$failure_case executou comando extra na linha $failure_line" ;;
  esac
}

run_failure_scenario() {
  failure_case=$1
  expected_status=$2
  npm_fail_args=$3
  npm_fail_status=$4
  compose_up_status=$5
  compose_down_status=$6
  expected_lines=$7
  failure_project="$TMP_DIR/failure-$failure_case-project"
  prepare_project "$failure_project"
  mkdir "$failure_project/node_modules"
  failure_log="$TMP_DIR/failure-$failure_case.log"

  set +e
  HARNESS_LOG="$failure_log" \
  FAKE_FAIL_ARGS="$npm_fail_args" \
  FAKE_FAIL_STATUS="$npm_fail_status" \
  FAKE_COMPOSE_UP_STATUS="$compose_up_status" \
  FAKE_COMPOSE_DOWN_STATUS="$compose_down_status" \
  PATH="$FAKE_BIN:$PATH" \
    sh "$failure_project/scripts/run-local.sh"
  failure_status=$?
  set -e
  [ "$failure_status" -eq "$expected_status" ] || fail "$failure_case retornou $failure_status em vez do status original $expected_status"

  failure_line=0
  while IFS='|' read -r failure_command _ _ _ _ failure_arguments; do
    failure_line=$((failure_line + 1))
    assert_failure_command "$failure_case" "$failure_line" "$failure_command" "$failure_arguments" "$failure_project"
    case $failure_arguments in
      *' down -v'|*' down --volumes'*) fail "$failure_case tentou remover o volume" ;;
    esac
  done < "$failure_log"
  [ "$failure_line" -eq "$expected_lines" ] || fail "$failure_case executou $failure_line comandos em vez de $expected_lines"
}

default_project="$TMP_DIR/default-project"
prepare_project "$default_project"
default_log="$TMP_DIR/default.log"
HARNESS_LOG="$default_log" \
LOCAL_DB_PORT=55432 \
PATH="$FAKE_BIN:$PATH" \
  sh "$default_project/scripts/run-local.sh"

expected_default_url='postgresql://pge:pge_local_only@127.0.0.1:55432/pge_local'
default_line=0
while IFS='|' read -r command db_port app_port database_url auth_secret arguments; do
  default_line=$((default_line + 1))
  [ "$db_port" = 55432 ] || fail "comando $default_line nao recebeu LOCAL_DB_PORT"
  [ "$app_port" = 3000 ] || fail "comando $default_line nao recebeu APP_PORT padrao"
  [ "$database_url" = "$expected_default_url" ] || fail "comando $default_line nao recebeu DATABASE_URL derivada"
  [ "$auth_secret" = 'local-development-secret-at-least-32-characters' ] || fail "comando $default_line nao recebeu AUTH_SECRET padrao"
  case $default_line in
    1) [ "$command|$arguments" = 'npm|ci' ] || fail 'npm ci nao foi o primeiro comando' ;;
    2)
      [ "$command" = docker ] || fail 'Compose up nao foi o segundo comando'
      [ "$arguments" = "compose -p pge-local -f $default_project/compose.dev.yaml up -d --wait" ] || fail 'Compose up recebeu argumentos incorretos'
      ;;
    3) [ "$command|$arguments" = 'npm|exec -- prisma migrate deploy' ] || fail 'migracao nao ocorreu antes da aplicacao' ;;
    4) [ "$command|$arguments" = 'npm|run dev -- --port 3000' ] || fail 'aplicacao nao recebeu APP_PORT padrao' ;;
    5)
      [ "$command" = docker ] || fail 'Compose down nao foi o ultimo comando'
      [ "$arguments" = "compose -p pge-local -f $default_project/compose.dev.yaml down" ] || fail 'limpeza normal recebeu argumentos incorretos'
      ;;
    *) fail 'fluxo padrao executou comandos extras' ;;
  esac
done < "$default_log"
[ "$default_line" -eq 5 ] || fail 'fluxo padrao nao executou cinco comandos'

override_project="$TMP_DIR/override-project"
prepare_project "$override_project"
mkdir "$override_project/node_modules"
override_log="$TMP_DIR/override.log"
custom_url='postgresql://custom:custom@database.example:5432/custom'
set +e
HARNESS_LOG="$override_log" \
LOCAL_DB_PORT=55433 \
APP_PORT=3200 \
DATABASE_URL="$custom_url" \
AUTH_SECRET=custom-auth-secret-at-least-32-characters \
FAKE_FAIL_ARGS='run dev -- --port 3200' \
PATH="$FAKE_BIN:$PATH" \
  sh "$override_project/scripts/run-local.sh"
override_status=$?
set -e
[ "$override_status" -eq 37 ] || fail 'status da aplicacao nao foi preservado'

override_line=0
while IFS='|' read -r command db_port app_port database_url auth_secret arguments; do
  override_line=$((override_line + 1))
  [ "$db_port" = 55433 ] || fail "comando de override $override_line nao recebeu LOCAL_DB_PORT"
  [ "$app_port" = 3200 ] || fail "comando de override $override_line nao recebeu APP_PORT"
  [ "$database_url" = "$custom_url" ] || fail "comando de override $override_line substituiu DATABASE_URL"
  [ "$auth_secret" = 'custom-auth-secret-at-least-32-characters' ] || fail "comando de override $override_line nao recebeu AUTH_SECRET"
  case $arguments in
    *' down -v'*) fail 'limpeza automatica tentou remover o volume' ;;
  esac
  case $override_line in
    1)
      [ "$command" = docker ] || fail 'node_modules existente nao omitiu npm ci'
      [ "$arguments" = "compose -p pge-local -f $override_project/compose.dev.yaml up -d --wait" ] || fail 'Compose up com override recebeu argumentos incorretos'
      ;;
    2) [ "$command|$arguments" = 'npm|exec -- prisma migrate deploy' ] || fail 'migracao com override ocorreu fora de ordem' ;;
    3) [ "$command|$arguments" = 'npm|run dev -- --port 3200' ] || fail 'falha controlada nao ocorreu na aplicacao' ;;
    4)
      [ "$command" = docker ] || fail 'falha nao acionou Compose down'
      [ "$arguments" = "compose -p pge-local -f $override_project/compose.dev.yaml down" ] || fail 'limpeza de falha recebeu argumentos incorretos'
      ;;
    *) fail 'fluxo com override executou comandos extras' ;;
  esac
done < "$override_log"
[ "$override_line" -eq 4 ] || fail 'fluxo com override nao executou quatro comandos'

run_failure_scenario compose-startup 41 '' '' 41 91 2
run_failure_scenario migration 42 'exec -- prisma migrate deploy' 42 '' 92 3
run_failure_scenario cleanup 43 'run dev -- --port 3000' 43 '' 93 4

run_signal_scenario HUP 129
run_signal_scenario INT 130
run_signal_scenario TERM 143

printf '%s\n' 'PASS: desenvolvimento local ordena comandos, preserva configuracao, status e dados'
