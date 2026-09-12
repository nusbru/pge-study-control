#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec dotnet test "$ROOT_DIR/backend/test/PgeStudy.Integration.Tests" "$@"
