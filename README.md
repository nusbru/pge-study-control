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

Crie o ambiente, revise os valores e suba os tres servicos:

```sh
cp .env.example .env
docker compose build
docker compose up -d --wait
docker compose ps
curl --fail --show-error http://127.0.0.1:3000/api/health
```

Substitua todos os valores `CHANGE_ME` em `.env` antes do primeiro `docker compose`.

A aplicacao escuta HTTP no host. Em qualquer exposicao publica, coloque-a atras de um proxy reverso com HTTPS, limite o acesso direto a `APP_PORT` e aplique rate limiting a `/login`, `/register` e `/api/auth/*`. Consulte [o guia de operacoes](docs/operations.md) para instalacao, atualizacao, logs, backup e restauracao.
