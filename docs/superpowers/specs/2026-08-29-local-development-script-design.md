# Script De Desenvolvimento Local

## Objetivo

Disponibilizar um unico comando para instalar dependencias npm quando necessario, iniciar o PostgreSQL local, aplicar as migracoes e executar a aplicacao em modo de desenvolvimento.

## Interface

O fluxo sera iniciado com:

```sh
./scripts/run-local.sh
```

O script podera ser chamado de qualquer diretorio. Ele usara os seguintes valores padrao:

- `LOCAL_DB_PORT=5433`;
- `APP_PORT=3000`;
- `DATABASE_URL=postgresql://pge:pge_local_only@127.0.0.1:5433/pge_local`;
- `AUTH_SECRET=local-development-secret-at-least-32-characters`.

Cada valor podera ser sobrescrito no ambiente do processo. Quando `LOCAL_DB_PORT` mudar e `DATABASE_URL` nao for informado, o script construira a URL com a nova porta. As credenciais do banco iniciado pelo Compose permanecerao locais e fixas: banco `pge_local`, usuario `pge` e senha `pge_local_only`.

## Compose De Desenvolvimento

Um novo `compose.dev.yaml` contera somente o servico PostgreSQL 17 Alpine. O servico:

- publicara a porta apenas em `127.0.0.1:${LOCAL_DB_PORT}:5432`;
- usara as credenciais locais definidas acima;
- tera health check com `pg_isready`;
- armazenara dados no volume nomeado `postgres_dev_data`.

O script usara o nome de projeto Compose fixo `pge-local`. Esse isolamento evita conflito de nomes e volumes com os ambientes de teste e producao.

## Fluxo De Execucao

O script sera POSIX `sh` com `set -eu` e resolvera o diretorio raiz a partir da propria localizacao. A sequencia sera:

1. Se `node_modules` nao existir na raiz, executar `npm ci`.
2. Executar `docker compose -p pge-local -f compose.dev.yaml up -d --wait`.
3. Executar `npm exec -- prisma migrate deploy` com `DATABASE_URL` exportada.
4. Executar `npm run dev -- --port "$APP_PORT"` em primeiro plano com `DATABASE_URL` e `AUTH_SECRET` exportadas.

O script nao criara nem modificara `.env`.

## Encerramento E Falhas

Depois que o Compose puder ter criado recursos, um trap tratara saida normal, falhas e os sinais `HUP`, `INT` e `TERM`. A limpeza executara `docker compose -p pge-local -f compose.dev.yaml down`, sem `-v`, para parar os containers sem remover `postgres_dev_data`.

O status original da instalacao, inicializacao, migracao, aplicacao ou sinal sera preservado. A falha da limpeza nao substituira esse status. Mensagens de erro dos comandos principais permanecerao visiveis.

## Documentacao

O README apresentara `./scripts/run-local.sh` como fluxo principal depois de clonar o repositorio. Tambem documentara:

- os quatro valores que podem ser sobrescritos;
- que `npm ci` so ocorre quando `node_modules` nao existe;
- que `Ctrl+C` para a aplicacao e o container, mas preserva os dados;
- que `docker compose -p pge-local -f compose.dev.yaml down -v` remove explicitamente o banco local quando desejado.

## Testes

Um teste shell executara uma copia do script em um projeto temporario, com executaveis falsos de `npm` e `docker`. Ele verificara:

- `npm ci` quando `node_modules` esta ausente e sua omissao quando existe;
- a ordem entre Compose, migracao e aplicacao;
- a propagacao de `LOCAL_DB_PORT`, `APP_PORT`, `DATABASE_URL` e `AUTH_SECRET`;
- a construcao de `DATABASE_URL` a partir da porta local;
- a preservacao de uma `DATABASE_URL` informada pelo usuario;
- a limpeza em saida normal e em falha;
- a preservacao do status de falha;
- a ausencia de `-v` no comando automatico de limpeza.

O teste sera incluido em `npm run test:operations`. Depois da implementacao, tambem serao executados lint e verificacao de tipos.
