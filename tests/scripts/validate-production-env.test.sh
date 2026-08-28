#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
VALIDATOR="$ROOT_DIR/scripts/validate-production-env.sh"
TEMPLATE="$ROOT_DIR/.env.example"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM

DB_PASSWORD=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
AUTH_SECRET_VALUE=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789

make_ready_env() {
  sed \
    -e "s/CHANGE_ME_RANDOM_DATABASE_PASSWORD/$DB_PASSWORD/g" \
    -e "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32/$AUTH_SECRET_VALUE/g" \
    "$TEMPLATE" > "$1"
}

replace_assignment() {
  sed "s|^$2=.*|$2=$3|" "$1" > "$1.tmp"
  mv "$1.tmp" "$1"
}

expect_rejected() {
  if "$VALIDATOR" "$TMP_DIR/$1.env" >"$TMP_DIR/$1.out" 2>"$TMP_DIR/$1.err"; then
    printf 'FAIL: %s foi aceito\n' "$2" >&2
    exit 1
  fi
}

cp "$TEMPLATE" "$TMP_DIR/pending.env"
expect_rejected pending 'template pendente'

make_ready_env "$TMP_DIR/ready.env"
if ! "$VALIDATOR" "$TMP_DIR/ready.env" >"$TMP_DIR/ready.out" 2>"$TMP_DIR/ready.err"; then
  printf '%s\n' 'FAIL: fluxo real do template foi rejeitado' >&2
  while IFS= read -r diagnostic || [ -n "$diagnostic" ]; do
    printf '  %s\n' "$diagnostic" >&2
  done < "$TMP_DIR/ready.err"
  exit 1
fi

: > "$TMP_DIR/empty-file.env"
expect_rejected empty-file 'arquivo vazio'

cp "$TMP_DIR/ready.env" "$TMP_DIR/empty-value.env"
replace_assignment "$TMP_DIR/empty-value.env" APP_PORT ''
expect_rejected empty-value 'valor vazio'

sed '/^AUTH_SECRET=/d' "$TMP_DIR/ready.env" > "$TMP_DIR/missing.env"
expect_rejected missing 'variavel ausente'

cp "$TMP_DIR/ready.env" "$TMP_DIR/duplicate.env"
printf '%s\n' 'APP_PORT=3001' >> "$TMP_DIR/duplicate.env"
expect_rejected duplicate 'variavel duplicada'

sed 's/^POSTGRES_USER=/ POSTGRES_USER=/' "$TMP_DIR/ready.env" > "$TMP_DIR/leading-space.env"
expect_rejected leading-space 'espaco antes da atribuicao'

sed 's/^POSTGRES_USER=/POSTGRES_USER =/' "$TMP_DIR/ready.env" > "$TMP_DIR/space-before-equals.env"
expect_rejected space-before-equals 'espaco antes do sinal de igual'

cp "$TMP_DIR/ready.env" "$TMP_DIR/trailing-space.env"
replace_assignment "$TMP_DIR/trailing-space.env" POSTGRES_DB 'pge_study_control '
expect_rejected trailing-space 'espaco depois do valor'

while IFS= read -r line || [ -n "$line" ]; do
  printf '%s\r\n' "$line"
done < "$TMP_DIR/ready.env" > "$TMP_DIR/crlf.env"
expect_rejected crlf 'arquivo CRLF'

cp "$TMP_DIR/ready.env" "$TMP_DIR/weak-password.env"
replace_assignment "$TMP_DIR/weak-password.env" POSTGRES_PASSWORD 'abc123'
expect_rejected weak-password 'senha curta do banco'

cp "$TMP_DIR/ready.env" "$TMP_DIR/malformed-password.env"
replace_assignment "$TMP_DIR/malformed-password.env" POSTGRES_PASSWORD 'g123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
expect_rejected malformed-password 'senha nao hexadecimal do banco'

cp "$TMP_DIR/ready.env" "$TMP_DIR/weak-auth.env"
replace_assignment "$TMP_DIR/weak-auth.env" AUTH_SECRET 'abc123'
expect_rejected weak-auth 'segredo de autenticacao curto'

cp "$TMP_DIR/ready.env" "$TMP_DIR/malformed-auth.env"
replace_assignment "$TMP_DIR/malformed-auth.env" AUTH_SECRET 'g123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
expect_rejected malformed-auth 'segredo de autenticacao nao hexadecimal'

cp "$TMP_DIR/ready.env" "$TMP_DIR/url-user.env"
replace_assignment "$TMP_DIR/url-user.env" DATABASE_URL "postgresql://other:$DB_PASSWORD@db:5432/pge_study_control"
expect_rejected url-user 'usuario divergente na URL'

cp "$TMP_DIR/ready.env" "$TMP_DIR/url-password.env"
replace_assignment "$TMP_DIR/url-password.env" DATABASE_URL "postgresql://pge:$AUTH_SECRET_VALUE@db:5432/pge_study_control"
expect_rejected url-password 'senha divergente na URL'

cp "$TMP_DIR/ready.env" "$TMP_DIR/bad-db.env"
replace_assignment "$TMP_DIR/bad-db.env" POSTGRES_DB 'bad/name'
expect_rejected bad-db 'nome de banco inseguro'

cp "$TMP_DIR/ready.env" "$TMP_DIR/bad-user.env"
replace_assignment "$TMP_DIR/bad-user.env" POSTGRES_USER 'bad:user'
expect_rejected bad-user 'nome de usuario inseguro'

cp "$TMP_DIR/ready.env" "$TMP_DIR/zero-port.env"
replace_assignment "$TMP_DIR/zero-port.env" APP_PORT '0'
expect_rejected zero-port 'porta zero'

cp "$TMP_DIR/ready.env" "$TMP_DIR/high-port.env"
replace_assignment "$TMP_DIR/high-port.env" APP_PORT '65536'
expect_rejected high-port 'porta acima do limite'

cp "$TMP_DIR/ready.env" "$TMP_DIR/nonnumeric-port.env"
replace_assignment "$TMP_DIR/nonnumeric-port.env" APP_PORT '30O0'
expect_rejected nonnumeric-port 'porta nao numerica'

cp "$TMP_DIR/ready.env" "$TMP_DIR/malformed.env"
printf '%s\n' 'BROKEN LINE' >> "$TMP_DIR/malformed.env"
expect_rejected malformed 'linha desconhecida'

if grep -E "$DB_PASSWORD|$AUTH_SECRET_VALUE" "$TMP_DIR"/*.out "$TMP_DIR"/*.err >/dev/null; then
  printf '%s\n' 'FAIL: validador imprimiu um segredo' >&2
  exit 1
fi

printf '%s\n' 'PASS: valida estrutura, valores, correspondencia e sigilo do ambiente de producao'
