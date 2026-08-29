#!/bin/sh
set -eu

LC_ALL=C
export LC_ALL

ENV_FILE=${1:-.env}

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

is_safe_name() {
  case $1 in
    '' | [!A-Za-z_]* | *[!A-Za-z0-9_]*) return 1 ;;
    *) return 0 ;;
  esac
}

is_hex_64() {
  [ "${#1}" -eq 64 ] || return 1
  case $1 in
    *[!0-9A-Fa-f]*) return 1 ;;
    *) return 0 ;;
  esac
}

if [ ! -f "$ENV_FILE" ]; then
  fail "Arquivo de ambiente nao encontrado: $ENV_FILE"
fi

carriage_return=$(printf '\r')
if grep -q "$carriage_return" "$ENV_FILE"; then
  fail 'Arquivo de ambiente usa terminadores CRLF'
fi

POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
DATABASE_URL=
AUTH_SECRET=
APP_PORT=
seen_postgres_db=0
seen_postgres_user=0
seen_postgres_password=0
seen_database_url=0
seen_auth_secret=0
seen_app_port=0
tab=$(printf '\t')

while IFS= read -r line || [ -n "$line" ]; do
  trimmed=$line
  while :; do
    case $trimmed in
      " "* | "$tab"*) trimmed=${trimmed#?} ;;
      *) break ;;
    esac
  done

  case $trimmed in
    '' | \#*) continue ;;
  esac

  case $line in
    POSTGRES_DB=*)
      [ "$seen_postgres_db" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      POSTGRES_DB=${line#POSTGRES_DB=}
      seen_postgres_db=1
      ;;
    POSTGRES_USER=*)
      [ "$seen_postgres_user" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      POSTGRES_USER=${line#POSTGRES_USER=}
      seen_postgres_user=1
      ;;
    POSTGRES_PASSWORD=*)
      [ "$seen_postgres_password" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      POSTGRES_PASSWORD=${line#POSTGRES_PASSWORD=}
      seen_postgres_password=1
      ;;
    DATABASE_URL=*)
      [ "$seen_database_url" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      DATABASE_URL=${line#DATABASE_URL=}
      seen_database_url=1
      ;;
    AUTH_SECRET=*)
      [ "$seen_auth_secret" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      AUTH_SECRET=${line#AUTH_SECRET=}
      seen_auth_secret=1
      ;;
    APP_PORT=*)
      [ "$seen_app_port" -eq 0 ] || fail 'Atribuicao duplicada no arquivo de ambiente'
      APP_PORT=${line#APP_PORT=}
      seen_app_port=1
      ;;
    *) fail 'Linha invalida no arquivo de ambiente' ;;
  esac
done < "$ENV_FILE"

if [ "$seen_postgres_db" -ne 1 ] ||
   [ "$seen_postgres_user" -ne 1 ] ||
   [ "$seen_postgres_password" -ne 1 ] ||
   [ "$seen_database_url" -ne 1 ] ||
   [ "$seen_auth_secret" -ne 1 ] ||
   [ "$seen_app_port" -ne 1 ]; then
  fail 'Arquivo de ambiente nao contem todas as atribuicoes obrigatorias'
fi

case "$POSTGRES_DB:$POSTGRES_USER:$POSTGRES_PASSWORD:$DATABASE_URL:$AUTH_SECRET:$APP_PORT" in
  *CHANGE_ME*) fail 'Arquivo de ambiente contem valor pendente' ;;
esac

is_safe_name "$POSTGRES_DB" || fail 'POSTGRES_DB invalido'
is_safe_name "$POSTGRES_USER" || fail 'POSTGRES_USER invalido'
is_hex_64 "$POSTGRES_PASSWORD" || fail 'POSTGRES_PASSWORD deve conter 64 caracteres hexadecimais'
is_hex_64 "$AUTH_SECRET" || fail 'AUTH_SECRET deve conter 64 caracteres hexadecimais'

expected_database_url="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB"
[ "$DATABASE_URL" = "$expected_database_url" ] || fail 'DATABASE_URL nao corresponde as credenciais configuradas'

case $APP_PORT in
  '' | *[!0-9]*) fail 'APP_PORT deve ser numerica e estar entre 1 e 65535' ;;
esac

normalized_port=$APP_PORT
while [ "${normalized_port#0}" != "$normalized_port" ]; do
  normalized_port=${normalized_port#0}
done

if [ -z "$normalized_port" ] ||
   [ "${#normalized_port}" -gt 5 ] ||
   [ "$normalized_port" -gt 65535 ]; then
  fail 'APP_PORT deve ser numerica e estar entre 1 e 65535'
fi

printf 'Arquivo de ambiente validado: %s\n' "$ENV_FILE"
