# PGE Study

Plataforma responsiva para registrar sessoes de estudo e acompanhar o desempenho ponderado por assunto.

## Requisitos

- Node.js 22.x e npm para desenvolvimento;
- Docker Engine com Docker Compose para os bancos de teste e a implantacao;
- Chromium do Playwright (`npm run test:e2e:install`) para testes de ponta a ponta;
- OpenSSL para gerar os segredos da implantacao.

## Desenvolvimento local

Instale as dependencias e prepare um arquivo local de ambiente:

```sh
npm ci
cp .env.test.example .env
```

Inicie o PostgreSQL de teste, aplique as migracoes e execute a aplicacao:

```sh
docker compose -f compose.test.yaml up -d --wait
DATABASE_URL='postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test' npm exec -- prisma migrate deploy
DATABASE_URL='postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test' AUTH_SECRET='local-development-secret-at-least-32-characters' npm run dev
```

Ao terminar, remova o banco local:

```sh
docker compose -f compose.test.yaml down -v
```

## Verificacao

```sh
npm run test:unit
npm run test:integration
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

Os scripts de integracao e E2E criam e removem seu proprio PostgreSQL de teste. O E2E usa a porta `3000` e deve ser executado sem outro servidor nessa porta.

## Producao com Compose

Crie o ambiente com segredos hexadecimais de 64 caracteres, proteja o arquivo, valide-o e suba os tres servicos:

```sh
set -eu
umask 077
cp .env.example .env
chmod 600 .env
DB_PASSWORD="$(openssl rand -hex 32)"
AUTH_SECRET_VALUE="$(openssl rand -hex 32)"
ENV_TMP="$(mktemp .env.tmp.XXXXXX)"
trap 'rm -f "$ENV_TMP"' 0 HUP INT TERM
sed \
  -e "s/CHANGE_ME_RANDOM_DATABASE_PASSWORD/$DB_PASSWORD/g" \
  -e "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32/$AUTH_SECRET_VALUE/g" \
  .env > "$ENV_TMP"
chmod 600 "$ENV_TMP"
mv "$ENV_TMP" .env
trap - 0 HUP INT TERM
unset ENV_TMP
unset DB_PASSWORD AUTH_SECRET_VALUE
./scripts/validate-production-env.sh .env
docker compose build
docker compose up -d --wait
docker compose ps --all
docker compose exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(async response => { const body = await response.text(); if (response.status !== 200 || body !== "{\"status\":\"ok\"}") { console.error(body); process.exit(1); } console.log(body); }).catch(error => { console.error(error.message); process.exit(1); })'
```

O validador ignora comentarios e linhas vazias, mas interrompe a sequencia antes do build se as seis atribuicoes obrigatorias estiverem ausentes, duplicadas ou malformadas, se algum valor estiver pendente ou fraco, ou se `DATABASE_URL` divergir das credenciais. Ele nao carrega o arquivo no shell nem imprime valores. A URL externa do health check e `http://127.0.0.1:<APP_PORT>/api/health`, com `<APP_PORT>` igual ao valor configurado em `.env`; o comando acima verifica a mesma rota por dentro do container, sem depender da porta do host.

A aplicacao escuta HTTP no host. Em qualquer exposicao publica, coloque-a atras de um proxy reverso com HTTPS, limite o acesso direto a `APP_PORT` e aplique rate limiting a `/login`, `/register` e `/api/auth/*`. Consulte [o guia de operacoes](docs/operations.md) para instalacao, atualizacao, logs, backup e restauracao.
