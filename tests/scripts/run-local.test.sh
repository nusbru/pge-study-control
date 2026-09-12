#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
exec node --test "$ROOT_DIR/tests/scripts/run-local.test.mjs"
