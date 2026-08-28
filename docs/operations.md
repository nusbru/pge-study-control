# Operacao da instalacao auto-hospedada

Execute os comandos a partir da raiz do repositorio. O host precisa de Docker Engine, Docker Compose, Git e OpenSSL.

## Preparar o ambiente

Crie o arquivo local com modo `600`, gere valores hexadecimais aleatorios de 64 caracteres e substitua todos os marcadores. A senha do PostgreSQL deve ser identica em `POSTGRES_PASSWORD` e na parte correspondente de `DATABASE_URL`.

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
```

O validador aceita comentarios que mencionem `CHANGE_ME`, mas interrompe a sequencia se um valor ainda contiver o marcador, se as seis atribuicoes obrigatorias estiverem ausentes, vazias, duplicadas ou malformadas, se os segredos nao tiverem 64 caracteres hexadecimais, se os nomes do banco e usuario forem inseguros, se `DATABASE_URL` divergir ou se `APP_PORT` nao estiver entre 1 e 65535. Ele le o arquivo como dados, sem carrega-lo no shell ou imprimir seus valores. Revise `APP_PORT`. O arquivo `.env` contem segredos e nao deve ser commitado, copiado para a imagem, carregado desnecessariamente no shell ou compartilhado.

## Primeira inicializacao

Valide a interpolacao, construa os alvos `migrator` e `runner` e inicie a pilha:

```sh
docker compose config
docker compose build
docker compose up -d --wait
```

O PostgreSQL precisa ficar saudavel antes da migracao. O servico `migrate` deve terminar com codigo 0 antes de `app` iniciar.

```sh
docker compose ps --all
docker compose exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(async response => { const body = await response.text(); if (response.status !== 200 || body !== "{\"status\":\"ok\"}") { console.error(body); process.exit(1); } console.log(body); }).catch(error => { console.error(error.message); process.exit(1); })'
```

A resposta esperada e `{"status":"ok"}`. A URL externa e `http://127.0.0.1:<APP_PORT>/api/health`, com `<APP_PORT>` igual ao valor configurado em `.env`; o comando acima usa a porta interna do container e funciona para qualquer `APP_PORT`. Um `503` com `{"status":"unavailable"}` indica que a aplicacao nao conseguiu consultar o PostgreSQL; detalhes permanecem apenas no log do servidor.

## Logs

```sh
docker compose logs --tail=100 app
docker compose logs migrate
docker compose logs --tail=100 db
```

Para acompanhar a aplicacao continuamente:

```sh
docker compose logs --follow app
```

## Atualizar

Antes de atualizar, faca backup. Depois obtenha apenas avancos da branch implantada, reconstrua as imagens e recrie os servicos. A migracao e executada antes da nova aplicacao.

```sh
git pull --ff-only
docker compose build --pull
docker compose up -d --wait --remove-orphans
docker compose ps --all
docker compose exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(async response => { const body = await response.text(); if (response.status !== 200 || body !== "{\"status\":\"ok\"}") { console.error(body); process.exit(1); } console.log(body); }).catch(error => { console.error(error.message); process.exit(1); })'
```

## Backup e restauracao

Crie o backup em um arquivo no host:

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

Verifique se `backup.sql` existe e nao esta vazio antes de depender dele. Guarde-o criptografado, teste restauracoes periodicamente e aplique uma politica externa de retencao.

O fluxo abaixo para `app`, recria explicitamente o banco vazio pelo banco de manutencao `postgres`, restaura com parada no primeiro erro e executa novamente o migrador. `dropdb --force` encerra conexoes ativas ao banco alvo. Se qualquer etapa, inclusive o health check final, falhar, o trap mantem `app` parado.

```sh
set -eu
restore_cleanup() {
  restore_status=$?
  trap - 0 HUP INT TERM
  if [ "$restore_status" -ne 0 ]; then
    docker compose stop app >/dev/null 2>&1 || :
  fi
  exit "$restore_status"
}
trap restore_cleanup 0 HUP INT TERM

docker compose stop app
test -s backup.sql
docker compose exec -T db sh -eu -c '
  dropdb --force --if-exists --maintenance-db=postgres -U "$POSTGRES_USER" "$POSTGRES_DB"
  createdb --maintenance-db=postgres -U "$POSTGRES_USER" "$POSTGRES_DB"
'
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup.sql
docker compose rm --force --stop migrate
docker compose up --no-deps --abort-on-container-exit --exit-code-from migrate migrate
docker compose up -d --wait app
docker compose ps --all
docker compose exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(async response => { const body = await response.text(); if (response.status !== 200 || body !== "{\"status\":\"ok\"}") { console.error(body); process.exit(1); } console.log(body); }).catch(error => { console.error(error.message); process.exit(1); })'

trap - 0 HUP INT TERM
```

## Encerrar

Pare os containers sem apagar os dados:

```sh
docker compose down
```

`docker compose down -v` apaga definitivamente o volume do PostgreSQL e so deve ser usado quando a perda de todos os dados for intencional ou depois de uma restauracao validada em outro ambiente.

## Proxy, HTTPS e limites

Nao exponha o HTTP da aplicacao diretamente a internet. Configure um proxy reverso externo para:

- terminar TLS com certificado valido e redirecionar HTTP para HTTPS;
- encaminhar o host original; `AUTH_TRUST_HOST=true` ja esta definido no container;
- restringir o acesso direto a `APP_PORT` por firewall;
- aplicar rate limiting mais rigoroso a `/login`, `/register` e `/api/auth/*`;
- definir limites de tamanho e tempo de requisicao apropriados.

O endpoint `/api/health` consulta o banco e serve para health checks. Se o proxy o publicar, limite o volume de requisicoes; a resposta nao contem detalhes internos.
