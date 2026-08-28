#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
VALIDATOR="$ROOT_DIR/scripts/validate-production-env.sh"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT HUP INT TERM

cat > "$TMP_DIR/pending.env" <<'EOF'
POSTGRES_PASSWORD=CHANGE_ME_RANDOM_DATABASE_PASSWORD
DATABASE_URL=postgresql://pge:CHANGE_ME_RANDOM_DATABASE_PASSWORD@db:5432/pge
AUTH_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32
APP_PORT=3000
EOF

if "$VALIDATOR" "$TMP_DIR/pending.env" >"$TMP_DIR/pending.out" 2>"$TMP_DIR/pending.err"; then
  printf '%s\n' 'FAIL: ambiente com CHANGE_ME foi aceito' >&2
  exit 1
fi

cat > "$TMP_DIR/ready.env" <<'EOF'
POSTGRES_PASSWORD=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
DATABASE_URL=postgresql://pge:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef@db:5432/pge
AUTH_SECRET=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
APP_PORT=4173
EOF

if ! "$VALIDATOR" "$TMP_DIR/ready.env" >"$TMP_DIR/ready.out" 2>"$TMP_DIR/ready.err"; then
  printf '%s\n' 'FAIL: ambiente sem marcadores foi rejeitado' >&2
  exit 1
fi

if grep -Eq '0123456789abcdef|abcdef0123456789' "$TMP_DIR"/*.out "$TMP_DIR"/*.err; then
  printf '%s\n' 'FAIL: validador imprimiu um segredo' >&2
  exit 1
fi

printf '%s\n' 'PASS: rejeita marcadores, aceita valores prontos e nao imprime segredos'
