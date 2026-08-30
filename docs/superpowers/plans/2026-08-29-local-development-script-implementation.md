# Local Development Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide one POSIX shell command that prepares npm dependencies, starts a persistent local PostgreSQL, applies Prisma migrations, runs Next.js development mode, and stops the container without deleting data.

**Architecture:** Add a development-only Compose file for PostgreSQL and a foreground orchestration script that owns its Compose project lifecycle. Test the script with fake `npm` and `docker` executables so operation tests verify sequencing, environment propagation, failure status, and non-destructive cleanup without starting real services.

**Tech Stack:** POSIX `sh`, Docker Compose, PostgreSQL 17 Alpine, npm, Prisma 7, Next.js 16

## Global Constraints

- The entry point is `./scripts/run-local.sh` and must work from any current directory.
- Use POSIX `sh` with `set -eu`.
- Run `npm ci` only when the project-root `node_modules` directory is absent.
- Use Compose project name `pge-local` and a dedicated `compose.dev.yaml`.
- Bind PostgreSQL only to `127.0.0.1:${LOCAL_DB_PORT}:5432`.
- Persist PostgreSQL data in the named volume `postgres_dev_data`.
- Default `LOCAL_DB_PORT` to `5433` and `APP_PORT` to `3000`.
- Default `DATABASE_URL` to `postgresql://pge:pge_local_only@127.0.0.1:<LOCAL_DB_PORT>/pge_local`.
- Default `AUTH_SECRET` to `local-development-secret-at-least-32-characters`.
- Preserve environment overrides for `LOCAL_DB_PORT`, `APP_PORT`, `DATABASE_URL`, and `AUTH_SECRET`.
- Apply migrations with `npm exec -- prisma migrate deploy` before starting the application.
- Run the application in the foreground with `npm run dev -- --port "$APP_PORT"`.
- On normal exit, failure, `HUP`, `INT`, or `TERM`, run Compose `down` without `-v` and preserve the original status.
- Do not create or modify `.env`.
- Do not alter the test or production Compose environments.
- Do not add dependencies.

---

## File Structure

- Create `compose.dev.yaml`: define the isolated, persistent development PostgreSQL service.
- Create `scripts/run-local.sh`: orchestrate npm installation, Compose, migrations, the development server, and cleanup.
- Create `tests/scripts/run-local.test.sh`: exercise the script with fake commands in temporary project roots.
- Modify `package.json`: include the new shell test in `test:operations`.
- Modify `README.md`: make the script the primary local-development workflow and document overrides and cleanup.

### Task 1: Add The Tested Local Runtime

**Files:**
- Create: `tests/scripts/run-local.test.sh`
- Create: `compose.dev.yaml`
- Create: `scripts/run-local.sh`
- Modify: `package.json:17`

**Interfaces:**
- Consumes: optional environment variables `LOCAL_DB_PORT`, `APP_PORT`, `DATABASE_URL`, and `AUTH_SECRET`; existing `package-lock.json`; Prisma migrations; Docker Compose.
- Produces: executable `scripts/run-local.sh`, Compose project `pge-local`, and persistent volume `pge-local_postgres_dev_data` derived from the declared `postgres_dev_data` volume.

- [ ] **Step 1: Write the failing shell test**

Create `tests/scripts/run-local.test.sh`:

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' 0 HUP INT TERM
FAKE_BIN="$TMP_DIR/bin"
mkdir "$FAKE_BIN"

cat > "$FAKE_BIN/npm" <<'SH'
#!/bin/sh
set -eu
printf 'npm|%s|%s|%s|%s|%s\n' \
  "${LOCAL_DB_PORT-}" "${APP_PORT-}" "${DATABASE_URL-}" "${AUTH_SECRET-}" "$*" \
  >> "$HARNESS_LOG"
if [ "$*" = "${FAKE_FAIL_ARGS-}" ]; then
  exit 37
fi
SH
chmod 755 "$FAKE_BIN/npm"

cat > "$FAKE_BIN/docker" <<'SH'
#!/bin/sh
set -eu
printf 'docker|%s|%s|%s|%s|%s\n' \
  "${LOCAL_DB_PORT-}" "${APP_PORT-}" "${DATABASE_URL-}" "${AUTH_SECRET-}" "$*" \
  >> "$HARNESS_LOG"
SH
chmod 755 "$FAKE_BIN/docker"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

prepare_project() {
  project=$1
  mkdir -p "$project/scripts"
  cp "$ROOT_DIR/scripts/run-local.sh" "$project/scripts/run-local.sh"
  cp "$ROOT_DIR/compose.dev.yaml" "$project/compose.dev.yaml"
}

default_project="$TMP_DIR/default-project"
prepare_project "$default_project"
default_log="$TMP_DIR/default.log"
HARNESS_LOG="$default_log" \
LOCAL_DB_PORT=55432 \
PATH="$FAKE_BIN:$PATH" \
  sh "$default_project/scripts/run-local.sh"

expected_default_url='postgresql://pge:pge_local_only@127.0.0.1:55432/pge_local'
default_line=0
while IFS='|' read -r command db_port app_port database_url auth_secret arguments; do
  default_line=$((default_line + 1))
  [ "$db_port" = 55432 ] || fail "comando $default_line nao recebeu LOCAL_DB_PORT"
  [ "$app_port" = 3000 ] || fail "comando $default_line nao recebeu APP_PORT padrao"
  [ "$database_url" = "$expected_default_url" ] || fail "comando $default_line nao recebeu DATABASE_URL derivada"
  [ "$auth_secret" = 'local-development-secret-at-least-32-characters' ] || fail "comando $default_line nao recebeu AUTH_SECRET padrao"
  case $default_line in
    1) [ "$command|$arguments" = 'npm|ci' ] || fail 'npm ci nao foi o primeiro comando' ;;
    2)
      [ "$command" = docker ] || fail 'Compose up nao foi o segundo comando'
      [ "$arguments" = "compose -p pge-local -f $default_project/compose.dev.yaml up -d --wait" ] || fail 'Compose up recebeu argumentos incorretos'
      ;;
    3) [ "$command|$arguments" = 'npm|exec -- prisma migrate deploy' ] || fail 'migracao nao ocorreu antes da aplicacao' ;;
    4) [ "$command|$arguments" = 'npm|run dev -- --port 3000' ] || fail 'aplicacao nao recebeu APP_PORT padrao' ;;
    5)
      [ "$command" = docker ] || fail 'Compose down nao foi o ultimo comando'
      [ "$arguments" = "compose -p pge-local -f $default_project/compose.dev.yaml down" ] || fail 'limpeza normal recebeu argumentos incorretos'
      ;;
    *) fail 'fluxo padrao executou comandos extras' ;;
  esac
done < "$default_log"
[ "$default_line" -eq 5 ] || fail 'fluxo padrao nao executou cinco comandos'

override_project="$TMP_DIR/override-project"
prepare_project "$override_project"
mkdir "$override_project/node_modules"
override_log="$TMP_DIR/override.log"
custom_url='postgresql://custom:custom@database.example:5432/custom'
set +e
HARNESS_LOG="$override_log" \
LOCAL_DB_PORT=55433 \
APP_PORT=3200 \
DATABASE_URL="$custom_url" \
AUTH_SECRET=custom-auth-secret-at-least-32-characters \
FAKE_FAIL_ARGS='run dev -- --port 3200' \
PATH="$FAKE_BIN:$PATH" \
  sh "$override_project/scripts/run-local.sh"
override_status=$?
set -e
[ "$override_status" -eq 37 ] || fail 'status da aplicacao nao foi preservado'

override_line=0
while IFS='|' read -r command db_port app_port database_url auth_secret arguments; do
  override_line=$((override_line + 1))
  [ "$db_port" = 55433 ] || fail "comando de override $override_line nao recebeu LOCAL_DB_PORT"
  [ "$app_port" = 3200 ] || fail "comando de override $override_line nao recebeu APP_PORT"
  [ "$database_url" = "$custom_url" ] || fail "comando de override $override_line substituiu DATABASE_URL"
  [ "$auth_secret" = 'custom-auth-secret-at-least-32-characters' ] || fail "comando de override $override_line nao recebeu AUTH_SECRET"
  case $arguments in
    *' down -v'*) fail 'limpeza automatica tentou remover o volume' ;;
  esac
  case $override_line in
    1)
      [ "$command" = docker ] || fail 'node_modules existente nao omitiu npm ci'
      [ "$arguments" = "compose -p pge-local -f $override_project/compose.dev.yaml up -d --wait" ] || fail 'Compose up com override recebeu argumentos incorretos'
      ;;
    2) [ "$command|$arguments" = 'npm|exec -- prisma migrate deploy' ] || fail 'migracao com override ocorreu fora de ordem' ;;
    3) [ "$command|$arguments" = 'npm|run dev -- --port 3200' ] || fail 'falha controlada nao ocorreu na aplicacao' ;;
    4)
      [ "$command" = docker ] || fail 'falha nao acionou Compose down'
      [ "$arguments" = "compose -p pge-local -f $override_project/compose.dev.yaml down" ] || fail 'limpeza de falha recebeu argumentos incorretos'
      ;;
    *) fail 'fluxo com override executou comandos extras' ;;
  esac
done < "$override_log"
[ "$override_line" -eq 4 ] || fail 'fluxo com override nao executou quatro comandos'

printf '%s\n' 'PASS: desenvolvimento local ordena comandos, preserva configuracao, status e dados'
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run:

```bash
sh tests/scripts/run-local.test.sh
```

Expected: FAIL because `scripts/run-local.sh` and `compose.dev.yaml` do not exist.

- [ ] **Step 3: Create the development Compose file**

Create `compose.dev.yaml`:

```yaml
services:
  db-dev:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: pge_local
      POSTGRES_USER: pge
      POSTGRES_PASSWORD: pge_local_only
    ports:
      - "127.0.0.1:${LOCAL_DB_PORT:-5433}:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pge -d pge_local"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  postgres_dev_data:
```

- [ ] **Step 4: Implement the orchestration script**

Create `scripts/run-local.sh`:

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/compose.dev.yaml"
COMPOSE_PROJECT_NAME=pge-local
LOCAL_DB_PORT=${LOCAL_DB_PORT:-5433}
APP_PORT=${APP_PORT:-3000}
DATABASE_URL=${DATABASE_URL:-"postgresql://pge:pge_local_only@127.0.0.1:$LOCAL_DB_PORT/pge_local"}
AUTH_SECRET=${AUTH_SECRET:-local-development-secret-at-least-32-characters}
export LOCAL_DB_PORT APP_PORT DATABASE_URL AUTH_SECRET
cleanup_required=0

cleanup() {
  status=$?
  trap - 0 HUP INT TERM
  if [ "$cleanup_required" -eq 1 ]; then
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down >/dev/null 2>&1 || :
  fi
  exit "$status"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$ROOT_DIR"
if [ ! -d node_modules ]; then
  npm ci
fi

cleanup_required=1
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d --wait
npm exec -- prisma migrate deploy
npm run dev -- --port "$APP_PORT"
```

Set its executable bit:

```bash
chmod 755 scripts/run-local.sh
```

- [ ] **Step 5: Run the focused shell test to verify it passes**

Run:

```bash
sh tests/scripts/run-local.test.sh
```

Expected output:

```text
PASS: desenvolvimento local ordena comandos, preserva configuracao, status e dados
```

- [ ] **Step 6: Validate the Compose model**

Run:

```bash
LOCAL_DB_PORT=5433 docker compose -p pge-local -f compose.dev.yaml config --quiet
```

Expected: exit status 0 and no validation errors.

- [ ] **Step 7: Add the shell test to the operation suite**

Change `package.json` so the script is:

```json
"test:operations": "sh tests/scripts/generate-production-env.test.sh && sh tests/scripts/test-runners.test.sh && sh tests/scripts/run-local.test.sh"
```

- [ ] **Step 8: Run operation and full verification tests**

Run:

```bash
npm run test:operations
npm test
npm run lint
npm run typecheck
```

Expected: every command exits with status 0; operation output includes the new `PASS: desenvolvimento local...` line.

- [ ] **Step 9: Commit the local runtime**

```bash
git add compose.dev.yaml scripts/run-local.sh tests/scripts/run-local.test.sh package.json
git commit -m "feat(dev): add local startup script"
```

### Task 2: Document The One-Command Workflow

**Files:**
- Modify: `README.md:12-33`

**Interfaces:**
- Consumes: `./scripts/run-local.sh`, `LOCAL_DB_PORT`, `APP_PORT`, `DATABASE_URL`, `AUTH_SECRET`, Compose project `pge-local`, and volume `postgres_dev_data` from Task 1.
- Produces: the public setup, override, shutdown, and destructive-reset instructions for local development.

- [ ] **Step 1: Replace the local-development section**

Replace `## Desenvolvimento local` through the paragraph before `## Verificacao` with:

````markdown
## Desenvolvimento local

Depois de clonar o repositorio, inicie o PostgreSQL, aplique as migracoes e execute a aplicacao com:

```sh
./scripts/run-local.sh
```

Na primeira execucao, o script tambem executa `npm ci` quando `node_modules` ainda nao existe. Os valores locais podem ser sobrescritos no mesmo comando:

```sh
LOCAL_DB_PORT=55432 APP_PORT=3100 ./scripts/run-local.sh
```

Os padroes sao `LOCAL_DB_PORT=5433`, `APP_PORT=3000`, `DATABASE_URL=postgresql://pge:pge_local_only@127.0.0.1:5433/pge_local` e `AUTH_SECRET=local-development-secret-at-least-32-characters`. Quando somente `LOCAL_DB_PORT` muda, a URL padrao acompanha a nova porta; `DATABASE_URL` e `AUTH_SECRET` tambem aceitam valores informados no ambiente.

Ao pressionar `Ctrl+C`, o script para a aplicacao e o container PostgreSQL, mas preserva os dados para a proxima execucao. Para remover explicitamente o banco local e seu volume:

```sh
docker compose -p pge-local -f compose.dev.yaml down -v
```
````

Keep the existing `## Requisitos` and `## Verificacao` sections unchanged.

- [ ] **Step 2: Review the rendered Markdown boundaries**

Run:

```bash
git diff --check -- README.md
```

Expected: exit status 0. Confirm the fenced blocks close before `## Verificacao` and that the old manual `compose.test.yaml` commands are gone from the local-development section.

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
npm test
npm run lint
npm run typecheck
```

Expected: every command exits with status 0.

- [ ] **Step 4: Commit the documentation**

```bash
git add README.md
git commit -m "docs: document local startup script"
```
