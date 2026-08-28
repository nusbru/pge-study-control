# Operacao da instalacao auto-hospedada

Execute os comandos a partir da raiz do repositorio. O host precisa de Docker Engine, Docker Compose, Git e OpenSSL.

## Preparar o ambiente

Crie o arquivo local, gere valores aleatorios URL-safe e substitua todos os marcadores. A senha do PostgreSQL deve ser identica em `POSTGRES_PASSWORD` e na parte correspondente de `DATABASE_URL`.

```sh
cp .env.example .env
DB_PASSWORD="$(openssl rand -hex 32)"
AUTH_SECRET_VALUE="$(openssl rand -hex 32)"
sed -i "s/CHANGE_ME_RANDOM_DATABASE_PASSWORD/$DB_PASSWORD/g" .env
sed -i "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32/$AUTH_SECRET_VALUE/" .env
unset DB_PASSWORD AUTH_SECRET_VALUE
```

Confirme que nenhum marcador ficou no arquivo e revise `APP_PORT`:

```sh
if grep -q 'CHANGE_ME' .env; then printf '%s\n' 'Substitua todos os valores CHANGE_ME em .env' >&2; exit 1; fi
```

O arquivo `.env` contem segredos e nao deve ser commitado, copiado para a imagem ou compartilhado.

## Primeira inicializacao

Valide a interpolacao, construa os alvos `migrator` e `runner` e inicie a pilha:

```sh
docker compose config
docker compose build
docker compose up -d --wait
```

O PostgreSQL precisa ficar saudavel antes da migracao. O servico `migrate` deve terminar com codigo 0 antes de `app` iniciar.

```sh
docker compose ps
curl --fail --show-error http://127.0.0.1:3000/api/health
```

A resposta esperada e `{"status":"ok"}`. Um `503` com `{"status":"unavailable"}` indica que a aplicacao nao conseguiu consultar o PostgreSQL; detalhes permanecem apenas no log do servidor.

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
docker compose ps
curl --fail --show-error http://127.0.0.1:3000/api/health
```

## Backup e restauracao

Crie o backup em um arquivo no host:

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

Verifique se `backup.sql` existe e nao esta vazio antes de depender dele. Guarde-o criptografado, teste restauracoes periodicamente e aplique uma politica externa de retencao.

O comando abaixo pressupoe um banco realmente vazio. Nao restaure este dump sobre tabelas existentes: isso pode falhar por objetos ou dados duplicados. Pare `app` e restaure em um banco novo/vazio antes de liberar trafego.

```sh
docker compose stop app
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql
docker compose start app
docker compose ps
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
