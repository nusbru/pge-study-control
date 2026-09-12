#!/bin/sh
set -eu
LC_ALL=C
export LC_ALL
ENV_FILE=${1:-.env}
fail() { printf '%s\n' "$1" >&2; exit 1; }
[ -f "$ENV_FILE" ] || fail 'Arquivo de ambiente nao encontrado'
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
APP_PORT=
seen='|'
tab=$(printf '\t')
cr=$(printf '\r')
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in *"$cr"*) fail 'Arquivo de ambiente usa terminadores CRLF' ;; esac
  trimmed=$line
  while :; do
    case "$trimmed" in ' '*|"$tab"*) trimmed=${trimmed#?} ;; *) break ;; esac
  done
  case "$trimmed" in ''|\#*) continue ;; esac
  key=${line%%=*}
  case "$seen" in *"|$key|"*) fail 'Atribuicao duplicada no arquivo de ambiente' ;; esac
  seen="$seen$key|"
  case "$line" in
    POSTGRES_DB=*) POSTGRES_DB=${line#*=} ;;
    POSTGRES_USER=*) POSTGRES_USER=${line#*=} ;;
    POSTGRES_PASSWORD=*) POSTGRES_PASSWORD=${line#*=} ;;
    APP_PORT=*) APP_PORT=${line#*=} ;;
    *) fail 'Linha invalida no arquivo de ambiente' ;;
  esac
done < "$ENV_FILE"
for name in "$POSTGRES_DB" "$POSTGRES_USER"; do
  case "$name" in ''|[!A-Za-z_]*|*[!A-Za-z0-9_]*) fail 'Nome de banco ou usuario invalido' ;; esac
done
[ "${#POSTGRES_PASSWORD}" -eq 64 ] || fail 'POSTGRES_PASSWORD deve conter 64 caracteres hexadecimais'
case "$POSTGRES_PASSWORD" in *[!0-9A-Fa-f]*) fail 'POSTGRES_PASSWORD invalido' ;; esac
case "$APP_PORT" in ''|*[!0-9]*) fail 'APP_PORT deve ser numerica' ;; esac
while [ "${APP_PORT#0}" != "$APP_PORT" ]; do APP_PORT=${APP_PORT#0}; done
if [ -z "$APP_PORT" ] || [ "${#APP_PORT}" -gt 5 ] || [ "$APP_PORT" -gt 65535 ]; then
  fail 'APP_PORT deve estar entre 1 e 65535'
fi
printf 'Arquivo de ambiente validado: %s\n' "$ENV_FILE"
