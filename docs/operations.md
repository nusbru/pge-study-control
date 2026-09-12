# Operações — Next.js + ASP.NET Core Identity

## Instalação

1. Instale Docker Engine/Compose e OpenSSL.
2. Gere `.env` com `scripts/generate-production-env.sh` e valide com `scripts/validate-production-env.sh`. O arquivo contém somente `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `APP_PORT`.
3. Execute `docker compose build` e `docker compose up -d --wait`.
4. Exponha `127.0.0.1:<APP_PORT>` por um proxy reverso HTTPS. A API não é exposta diretamente. Cookies de produção exigem HTTPS mesmo que o trecho interno use HTTP.

O gerador recusa sobrescrita, usa modo 600 e publicação atômica. Não reaproveite o arquivo antigo com `DATABASE_URL`/`AUTH_SECRET`; use `.env.identity` e `docker compose --env-file .env.identity ...` se quiser preservar o arquivo antigo.

O proxy deve preservar Host e cookies, **sobrescrever `X-Forwarded-Proto` com `https`**, encaminhar `/api/*` junto das páginas para Next.js e permitir os métodos POST/PUT/DELETE. O Next.js repassa esse esquema à API para validação antiforgery. `ReverseProxy:KnownNetworks` permite as redes privadas usadas pelo Docker; a porta API permanece interna. Em outra topologia, restrinja essa lista à rede real do proxy e nunca exponha a API com redes confiáveis excessivamente amplas. Configure limitação de requisições para `/api/auth/register` e `/api/auth/login`.

## Saúde e logs

```sh
docker compose ps --all
docker compose logs --tail=100 app api migrate
curl --fail http://127.0.0.1:3000/health
curl --fail http://127.0.0.1:3000/api/health
```

`/health` verifica o frontend; `/api/health` verifica a conexão PostgreSQL. O healthcheck Compose do frontend consulta ambas. Falhas de API são registradas no console com identificador de requisição e retornam mensagens genéricas para o navegador.

## Atualização

Faça backup antes de aplicar alterações de esquema. Depois:

```sh
docker compose build
docker compose stop app api
docker compose run --rm migrate
docker compose up -d --wait
```

O serviço `migrate` executa `dotnet PgeStudy.Host.dll --migrate`. O processo API normal não aplica migrações. Não faça rollback de imagens sem verificar a compatibilidade com o esquema já aplicado.

Se mudar o hostname interno da API, ajuste tanto o build argument `API_INTERNAL_URL` do frontend quanto sua variável de runtime. Os rewrites Next.js ficam fixados no build.

## Chaves e sessões Identity

`identity_keys` guarda o key ring de Data Protection; `identity_postgres_data` guarda o banco. Chaves são mantidas em volume com permissões do usuário não-root `app`. Proteja o volume e seus backups: as chaves permitem ler tickets Identity. Em múltiplas réplicas, compartilhe o mesmo key ring e ApplicationName (`PgeStudy`).

A perda das chaves invalida cookies existentes, mas não remove contas. Não apague chaves antigas durante a rotação. O ticket tem duração fixa de oito horas. Alteração do security stamp revoga a autenticação do usuário; logout remove o cookie do navegador.

## Backup e restauração

Banco (backup em formato custom):

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > pge-identity.dump
```

Armazene também um backup restrito do volume `identity_keys`, usando o mecanismo de backup de volumes do host. Criptografe os backups fora do host e teste sua restauração.

Para restaurar em uma instalação preparada com o mesmo esquema/credenciais, pare `app` e `api`, restaure o dump e o key ring, e reinicie os serviços:

```sh
docker compose stop app api
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < pge-identity.dump
docker compose up -d --wait
```

Os dados antigos da versão Prisma não são convertidos. Os nomes dos volumes novos impedem que o primeiro start substitua dados antigos. `docker compose down` preserva volumes; `down -v` os remove e deve ser usado apenas quando a exclusão for intencional.
