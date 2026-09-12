#!/bin/sh
set -eu

# Named volumes survive image rebuilds. Refresh dependencies when the mounted lockfile changes.
if ! sha256sum -c node_modules/.package-lock.sha256 >/dev/null 2>&1; then
  npm ci
  sha256sum package-lock.json > node_modules/.package-lock.sha256
fi
exec npm run dev -- --hostname 0.0.0.0 --port 3000
