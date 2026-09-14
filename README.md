# PGE Study

Plataforma responsiva para registrar sessões de estudo e acompanhar o desempenho ponderado por assunto.

## Arquitetura

- **Frontend:** Next.js 16, React 19, TypeScript e CSS Modules. Mantém as páginas, textos e decisões visuais de `DESIGN.md`.
- **API:** ASP.NET Core 10, ASP.NET Core Identity, EF Core e PostgreSQL 17.
- **Autenticação:** cookie HttpOnly de mesma origem e antiforgery em todas as mutações. A API verifica a propriedade dos registros.
- **Dados:** banco novo, gerenciado exclusivamente pelas migrações EF. Volumes novos não substituem os volumes da implementação Prisma.

O navegador usa `/api/*`, encaminhado pelo Next.js para a API. Server Components consultam a API usando o cookie Identity, sem cache de dados privados. O frontend não recebe credenciais do PostgreSQL. `src/lib/api/generated.d.ts` é gerado do OpenAPI; `src/lib/api/contracts.ts` adapta datas para os componentes existentes.

O backend está em `backend/src`, dividido em Domain, Application, Infrastructure e Host. As regras incluem normalização de assuntos, contagens consistentes, períodos inclusivos e percentuais ponderados. Veja [a arquitetura](docs/architecture.md).

## Requisitos

- Docker Engine e Docker Compose para iniciar todo o ambiente local;
- Node.js 22.x e npm para executar as ferramentas/testes no host (o frontend local usa Node dentro do container);
- .NET SDK 10 para desenvolvimento da API, testes e geração dos contratos;
- Chromium do Playwright: `npm run test:e2e:install`;
- OpenSSL para gerar a configuração de produção.

## Desenvolvimento local

```sh
./scripts/run-local.sh
```

O script constrói e inicia **frontend, API e PostgreSQL em containers**, aplicando migrações em um serviço dedicado. Aguarda a saúde do frontend e da API e acompanha os logs. `Ctrl+C` encerra os containers, preservando dados e chaves Identity.

O Next.js roda com hot reload: edite os arquivos normalmente no host. O código é montado em `/app`; `node_modules` e `.next` usam volumes Docker separados dos diretórios do host. As dependências são instaladas na imagem e atualizadas no volume quando o `package-lock.json` muda, na próxima inicialização. Reinicie o script depois de alterar dependências. O script utiliza seu UID/GID para que arquivos gerados no código montado pertençam ao seu usuário.

```sh
LOCAL_DB_PORT=55432 API_PORT=5081 APP_PORT=3100 ./scripts/run-local.sh
```

Padrões: frontend `http://localhost:3000`, API `http://127.0.0.1:5080`, PostgreSQL local na porta `5433`. O frontend acessa a API pelo endereço interno `http://api:8080`, independentemente das portas do host. O banco se chama `pge_identity_local`. Os logs também ficam disponíveis com:

```sh
docker compose -p pge-local -f compose.dev.yaml logs -f app api
```

O projeto Compose padrão é `pge-local`; `COMPOSE_PROJECT_NAME` permite isolar outra execução. Para iniciar desacoplado do terminal, use `docker compose -p pge-local -f compose.dev.yaml up -d --build --wait` e encerre com `docker compose -p pge-local -f compose.dev.yaml down`.

Para executar a API diretamente com hot reload no host, encerre o ambiente containerizado, inicie somente o banco e o migrador e execute:

```sh
docker compose -p pge-local -f compose.dev.yaml up -d --build db-dev migrate
ASPNETCORE_ENVIRONMENT=Development \
ConnectionStrings__Database='Host=127.0.0.1;Port=5433;Database=pge_identity_local;Username=pge;Password=pge_local_only' \
dotnet watch --project backend/src/PgeStudy.Host run -- --urls http://127.0.0.1:5080
```

Em outro terminal: `npm run dev`. OpenAPI: `http://127.0.0.1:5080/api/openapi/v1.json` em Development/Testing.

## Verificação

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run test:backend
npm run api:types:check
npm run test:e2e
npm run test:production
npm run test:local-containers
```

`npm test` executa testes de frontend e scripts operacionais. `test:backend` executa xUnit e testes de API com PostgreSQL real via Testcontainers. `test:integration` executa apenas os testes de integração .NET.

O E2E cria um projeto Compose exclusivo com API em porta aleatória, constrói o frontend de produção, executa os testes desktop/mobile e remove somente os recursos dessa execução. Reserve a porta 3000 ou escolha outra com `E2E_PORT=3101 npm run test:e2e`. Não execute builds/desenvolvimento Next simultaneamente na mesma pasta `.next`.

`test:production` usa os containers de produção, testa cookies Secure através do proxy e recria a API para verificar a persistência das chaves. Usa a porta 3141 (`PRODUCTION_TEST_PORT` para alterar) e remove seu próprio banco/volumes ao concluir. O teste simula o cabeçalho de esquema do proxy HTTPS no loopback; não testa certificados TLS externos.

`test:local-containers` verifica a inicialização local, os volumes isolados, o proxy da API, hot reload no navegador e encerramento por `Ctrl+C`. Usa uma cópia temporária do projeto e portas aleatórias, sem editar o código original durante o teste.

Após mudar contratos C#:

```sh
npm run api:types
```

O gerador inicia uma API temporária para ler seu OpenAPI; não precisa de banco. Para novas migrações:

```sh
dotnet tool restore
dotnet ef migrations add NomeDaMigracao --project backend/src/PgeStudy.Infrastructure --startup-project backend/src/PgeStudy.Host --output-dir Persistence/Migrations
```

## Catálogo de assuntos

Toda sessão exige um assunto cadastrado. A tabela `study_subjects` contém `id` (GUID) e `subject`; o código de categorização faz parte do texto, por exemplo `1000 — Constitucionalismo`. O formulário carrega as opções de `GET /api/subjects`, autenticado, e envia `subjectId` na criação e edição.

O seed inicial com 26 assuntos fica em `backend/src/PgeStudy.Infrastructure/Persistence/SubjectSeed.cs`. Ele usa `UseSeeding`/`UseAsyncSeeding` do EF Core, com GUIDs fixos e inserção somente dos registros ausentes. O serviço Compose `migrate` já aplica a migration e executa o seed. Para executar diretamente, configure `ConnectionStrings__Database` no ambiente e use:

```sh
dotnet run --project backend/src/PgeStudy.Host --no-launch-profile -- --migrate
```

Também é possível usar o CLI do EF com a mesma variável de conexão:

```sh
dotnet ef database update --project backend/src/PgeStudy.Infrastructure --startup-project backend/src/PgeStudy.Host
```

Para acrescentar assuntos, adicione pares de **novo GUID fixo + texto** em `SubjectSeed.cs`, publique o migrador atualizado e execute-o novamente. Preserve os GUIDs existentes. A rotina não duplica registros nem altera vínculos de sessões e executa mesmo sem migrations pendentes. Ela insere novos itens; renomeações de itens existentes devem ser feitas por uma migration de dados, preservando o ID. Scripts SQL de migration executados externamente não acionam os callbacks de seed.

A migration `AddStudySubjects` pressupõe que não há sessões anteriores a migrar. Ela substitui o texto livre por uma chave estrangeira obrigatória, sem assunto padrão, e impede excluir assuntos em uso.

## Produção

```sh
./scripts/generate-production-env.sh
./scripts/validate-production-env.sh
docker compose build
docker compose up -d --wait
```

Se já houver um `.env` da versão anterior, o gerador não o sobrescreve. Gere um arquivo separado e use-o explicitamente:

```sh
./scripts/generate-production-env.sh .env.example .env.identity
docker compose --env-file .env.identity up -d --build --wait
```

Produção exige HTTPS no proxy reverso que expõe o frontend. A porta do app é vinculada ao loopback; API e banco permanecem internos. Consulte [operações](docs/operations.md) para chaves Identity, backup e atualização.

CI executa verificações frontend/backend, compatibilidade OpenAPI e E2E. Pushes aprovados em `main` publicam três imagens no Docker Hub usando `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`:

| Imagem | Finalidade | Target Docker |
| --- | --- | --- |
| `pge-study-control` | Frontend Next.js | `runner` |
| `pge-study-control-api` | API ASP.NET Core | `runner` |
| `pge-study-control-migrations` | Aplica migrations EF Core e encerra, sem iniciar o servidor HTTP | `migrator` |

Todas recebem `latest` e a mesma tag `v1.0.YYYYMMDDHHMMSS` (UTC). Use a mesma versão da API e do migrador em cada implantação. A imagem de migrations precisa de `ConnectionStrings__Database` e acesso de rede ao PostgreSQL; seu entrypoint já executa `dotnet PgeStudy.Host.dll --migrate`. Veja [execução manual no Dokploy](docs/operations.md#migrations-manuais-no-dokploy).
