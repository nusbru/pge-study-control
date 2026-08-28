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
TEST_DB_PORT=5433 docker compose -f compose.test.yaml up -d --wait
DATABASE_URL='postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test' npm exec -- prisma migrate deploy
DATABASE_URL='postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test' AUTH_SECRET='local-development-secret-at-least-32-characters' npm run dev
```

Ao terminar, remova o banco local:

```sh
TEST_DB_PORT=5433 docker compose -f compose.test.yaml down -v
```

## Verificacao

```sh
npm test
npm run test:integration
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

`npm test` encadeia os scripts nomeados `test:unit`, `test:operations` e `test:security`. Os scripts de integracao e E2E usam projetos Compose exclusivos e portas PostgreSQL aleatorias, removendo somente os recursos da propria execucao. O E2E usa a porta `3000` e deve ser executado sem outro servidor nessa porta.

## Producao com Compose

Gere e valide o ambiente com segredos hexadecimais de 64 caracteres e suba os tres servicos:

```sh
./scripts/generate-production-env.sh
docker compose build
docker compose up -d --wait
docker compose ps --all
docker compose exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(async response => { const body = await response.text(); if (response.status !== 200 || body !== "{\"status\":\"ok\"}") { console.error(body); process.exit(1); } console.log(body); }).catch(error => { console.error(error.message); process.exit(1); })'
```

O gerador recusa sobrescrever `.env`, cria o arquivo com modo `600`, gera os segredos sem inclui-los em argumentos de processos filhos e executa o validador antes da instalacao atomica. O validador ignora comentarios e linhas vazias, mas interrompe a sequencia antes do build se as seis atribuicoes obrigatorias estiverem ausentes, duplicadas ou malformadas, se algum valor estiver pendente ou fraco, ou se `DATABASE_URL` divergir das credenciais. Nenhum dos scripts imprime os valores secretos. A URL externa do health check e `http://127.0.0.1:<APP_PORT>/api/health`, com `<APP_PORT>` igual ao valor configurado em `.env`; o comando acima verifica a mesma rota por dentro do container, sem depender da porta do host.

A aplicacao escuta HTTP no host. Em qualquer exposicao publica, coloque-a atras de um proxy reverso com HTTPS, limite o acesso direto a `APP_PORT` e aplique rate limiting a `/login`, `/register` e `/api/auth/*`. Consulte [o guia de operacoes](docs/operations.md) para instalacao, atualizacao, logs, backup e restauracao.
