#!/bin/sh
set -eu

unset db_password auth_secret

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

TEMPLATE_FILE=${1:-"$ROOT_DIR/.env.example"}
OUTPUT_FILE=${2:-"$ROOT_DIR/.env"}
VALIDATOR="$ROOT_DIR/scripts/validate-production-env.sh"

case $OUTPUT_FILE in
  -*) fail 'Caminho do arquivo de saida nao pode iniciar com hifen' ;;
esac

if [ -e "$OUTPUT_FILE" ] || [ -L "$OUTPUT_FILE" ]; then
  fail "O arquivo de ambiente ja existe: $OUTPUT_FILE"
fi
[ -f "$TEMPLATE_FILE" ] || fail "Template de ambiente nao encontrado: $TEMPLATE_FILE"

case $OUTPUT_FILE in
  */*) output_directory=${OUTPUT_FILE%/*}; [ -n "$output_directory" ] || output_directory=/ ;;
  *) output_directory=. ;;
esac
output_name=${OUTPUT_FILE##*/}
[ -n "$output_name" ] || fail 'Caminho de saida invalido'
[ -d "$output_directory" ] || fail "Diretorio de saida nao encontrado: $output_directory"

umask 077
temporary_file=
cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ -n "${temporary_file-}" ]; then
    rm -f "$temporary_file"
  fi
  unset db_password auth_secret
  exit "$status"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

temporary_file=$(mktemp "$output_directory/.$output_name.tmp.XXXXXX")
chmod 600 "$temporary_file"
db_password=$(openssl rand -hex 32)
database_password_replacements=0

{
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in
      POSTGRES_PASSWORD=CHANGE_ME_RANDOM_DATABASE_PASSWORD)
        printf 'POSTGRES_PASSWORD=%s\n' "$db_password"
        database_password_replacements=$((database_password_replacements + 1))
        ;;
      *) printf '%s\n' "$line" ;;
    esac
  done < "$TEMPLATE_FILE"
} > "$temporary_file"

if [ "$database_password_replacements" -ne 1 ]; then
  fail 'Template de ambiente nao contem os marcadores esperados'
fi

unset db_password auth_secret
"$VALIDATOR" "$temporary_file" >/dev/null

# A hard link publishes the complete, validated inode without overwriting a path
# that may have appeared after the initial safety check.
if ! ln "$temporary_file" "$OUTPUT_FILE"; then
  fail "Nao foi possivel instalar o arquivo sem sobrescrever: $OUTPUT_FILE"
fi
rm -f "$temporary_file"
temporary_file=
trap - 0 HUP INT TERM
