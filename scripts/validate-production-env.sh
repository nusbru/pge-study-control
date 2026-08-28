#!/bin/sh
set -eu

ENV_FILE=${1:-.env}

if [ ! -f "$ENV_FILE" ]; then
  printf 'Arquivo de ambiente nao encontrado: %s\n' "$ENV_FILE" >&2
  exit 1
fi

if grep -q 'CHANGE_ME' "$ENV_FILE"; then
  printf 'Substitua todos os valores CHANGE_ME em %s\n' "$ENV_FILE" >&2
  exit 1
fi

printf 'Arquivo de ambiente validado: %s\n' "$ENV_FILE"
