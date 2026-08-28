#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
GENERATOR="$ROOT_DIR/scripts/generate-production-env.sh"
VALIDATOR="$ROOT_DIR/scripts/validate-production-env.sh"
TEMPLATE="$ROOT_DIR/.env.example"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM

DB_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
AUTH_SECRET_VALUE=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
FAKE_BIN="$TMP_DIR/bin"
mkdir "$FAKE_BIN"

cat > "$FAKE_BIN/openssl" <<'SH'
#!/bin/sh
set -eu
[ "$#" -eq 3 ] && [ "$1" = rand ] && [ "$2" = -hex ] && [ "$3" = 32 ] || exit 64
count=0
if [ -f "$FAKE_OPENSSL_STATE" ]; then
  IFS= read -r count < "$FAKE_OPENSSL_STATE"
fi
count=$((count + 1))
printf '%s\n' "$count" > "$FAKE_OPENSSL_STATE"
if [ "${FAKE_OPENSSL_FAIL_AT:-0}" -eq "$count" ]; then
  exit 17
fi
if [ "$count" -eq 1 ]; then
  printf '%s\n' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
else
  printf '%s\n' bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
fi
SH
chmod 755 "$FAKE_BIN/openssl"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_no_temporary_output() {
  for temporary_file in "$TMP_DIR"/."$1".tmp.*; do
    [ ! -e "$temporary_file" ] || fail "arquivo temporario permaneceu: $temporary_file"
  done
}

SUCCESS_ENV="$TMP_DIR/generated.env"
SUCCESS_OUT="$TMP_DIR/success.out"
SUCCESS_ERR="$TMP_DIR/success.err"
FAKE_OPENSSL_STATE="$TMP_DIR/openssl-success.state" PATH="$FAKE_BIN:$PATH" \
  "$GENERATOR" "$TEMPLATE" "$SUCCESS_ENV" >"$SUCCESS_OUT" 2>"$SUCCESS_ERR"

[ -f "$SUCCESS_ENV" ] || fail 'gerador nao criou o arquivo de ambiente'
[ "$(stat -c '%a' "$SUCCESS_ENV")" = 600 ] || fail 'arquivo gerado nao usa modo 600'
assert_no_temporary_output generated.env

generated_db_secret=
generated_auth_secret=
while IFS= read -r line || [ -n "$line" ]; do
  case $line in
    POSTGRES_PASSWORD=*) generated_db_secret=${line#POSTGRES_PASSWORD=} ;;
    AUTH_SECRET=*) generated_auth_secret=${line#AUTH_SECRET=} ;;
  esac
done < "$SUCCESS_ENV"
[ "$generated_db_secret" = "$DB_SECRET" ] || fail 'senha do banco nao foi gerada internamente'
[ "$generated_auth_secret" = "$AUTH_SECRET_VALUE" ] || fail 'segredo de autenticacao nao foi gerado internamente'

captured_output=
while IFS= read -r line || [ -n "$line" ]; do
  captured_output=$captured_output$line
done < "$SUCCESS_OUT"
while IFS= read -r line || [ -n "$line" ]; do
  captured_output=$captured_output$line
done < "$SUCCESS_ERR"
case $captured_output in
  *"$DB_SECRET"* | *"$AUTH_SECRET_VALUE"*) fail 'gerador imprimiu um segredo' ;;
esac

if ! "$VALIDATOR" "$SUCCESS_ENV" >"$TMP_DIR/validator.out" 2>"$TMP_DIR/validator.err"; then
  fail 'arquivo gerado nao e compativel com o validador real'
fi

EXISTING_ENV="$TMP_DIR/existing.env"
printf '%s\n' 'preserve-me' > "$EXISTING_ENV"
if FAKE_OPENSSL_STATE="$TMP_DIR/openssl-existing.state" PATH="$FAKE_BIN:$PATH" \
  "$GENERATOR" "$TEMPLATE" "$EXISTING_ENV" >"$TMP_DIR/existing.out" 2>"$TMP_DIR/existing.err"; then
  fail 'gerador sobrescreveu um arquivo existente'
fi
existing_contents=
IFS= read -r existing_contents < "$EXISTING_ENV"
[ "$existing_contents" = preserve-me ] || fail 'arquivo existente foi alterado'
assert_no_temporary_output existing.env

FAILED_ENV="$TMP_DIR/failed.env"
if FAKE_OPENSSL_FAIL_AT=2 FAKE_OPENSSL_STATE="$TMP_DIR/openssl-failure.state" PATH="$FAKE_BIN:$PATH" \
  "$GENERATOR" "$TEMPLATE" "$FAILED_ENV" >"$TMP_DIR/failure.out" 2>"$TMP_DIR/failure.err"; then
  fail 'gerador aceitou falha do OpenSSL'
fi
[ ! -e "$FAILED_ENV" ] || fail 'falha deixou arquivo de ambiente parcial'
assert_no_temporary_output failed.env

failure_output=
while IFS= read -r line || [ -n "$line" ]; do
  failure_output=$failure_output$line
done < "$TMP_DIR/failure.out"
while IFS= read -r line || [ -n "$line" ]; do
  failure_output=$failure_output$line
done < "$TMP_DIR/failure.err"
case $failure_output in
  *"$DB_SECRET"* | *"$AUTH_SECRET_VALUE"*) fail 'falha imprimiu um segredo' ;;
esac

printf '%s\n' 'PASS: gera, protege, valida e instala o ambiente sem expor segredos'
