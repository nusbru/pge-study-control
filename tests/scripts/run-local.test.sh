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
if [ "$*" = "${FAKE_FAIL_ARGS-}" ]; then
  exit 37
fi
SH
chmod 755 "$FAKE_BIN/npm"

cat > "$FAKE_BIN/docker" <<'SH'
#!/bin/sh
set -eu
printf 'docker|%s|%s|%s|%s|%s\n' \
  "${LOCAL_DB_PORT-}" "${APP_PORT-}" "${DATABASE_URL-}" "${AUTH_SECRET-}" "$*" \
  >> "$HARNESS_LOG"
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
  cp "$ROOT_DIR/compose.dev.yaml" "$project/compose.dev.yaml"
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

printf '%s\n' 'PASS: desenvolvimento local ordena comandos, preserva configuracao, status e dados'
