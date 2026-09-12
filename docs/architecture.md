# Architecture after the ASP.NET migration

## Boundaries

Next.js owns rendering, routes, CSS and browser interaction. ASP.NET Core owns account management, authenticated identity, authorization, validation, persistence and reporting. Neither browser input nor Next.js parameters can supply the owner of a study session.

Backend dependencies: Host → Application → Domain; Host → Infrastructure → Application/Domain. Infrastructure implements application interfaces and supplies EF/Identity adapters. Domain is framework-independent. The application remains one modular API and one relational database.

## Authentication

Identity uses its standard password hasher and EF stores, unique normalized emails, an eight-hour non-sliding authentication ticket, and login lockout after five failed attempts for five minutes. Password length remains 8–128 without mandatory character classes. New accounts can sign in immediately, matching the original product.

The `pge.identity` cookie is HttpOnly, Path=/, SameSite=Lax and Secure in production. Identity security stamps are checked on requests, without renewing cookies during SSR. `/api/auth/me` supplies the current user; missing authentication produces 401. Owned-resource mismatches produce 404. Roles are not part of the current product.

Before login, registration, logout or session mutations, the browser obtains a fresh request token from `/api/auth/csrf`. It sends the token in `X-CSRF-TOKEN`, alongside the HttpOnly antiforgery cookie. JSON endpoints explicitly validate tokens. Fetching a new token per mutation avoids reusing anonymous tokens after login. Production persists Data Protection keys in `identity_keys`.

Browser requests reach the API through the Next.js request-time proxy in `src/proxy.ts`, so cookie issuance reaches the browser directly. The HTTPS edge overwrites `X-Forwarded-Proto`; ASP.NET trusts the configured private proxy networks for that scheme, allowing Secure antiforgery cookies behind the internal HTTP hop. Server Components forward only the Identity cookie to a fixed internal API origin. API responses and server fetches are uncached. Successful mutations use document navigation to discard prefetched private pages and reload persisted data.

## Contracts and behavior

OpenAPI generates `src/lib/api/generated.d.ts`. Responses use camelCase, numeric counts, `YYYY-MM-DD` calendar dates, and UTC audit timestamps. A frontend adapter converts dates into the Date-based view model supported by React serialization, preserving existing component markup.

Question types retain `JURISPRUDENCE`, `BLACK_LETTER_LAW`, `DOCTRINE`, and the readable/filterable `UNSPECIFIED` compatibility value. New/edited sessions require one of the first three. Session IDs are UUIDs, while Identity owns opaque string user IDs.

The API computes subject grouping keys and resolves counts independently of the client's convenience calculations. PostgreSQL CHECK constraints enforce ranges and `total = correct + wrong`. All CRUD is scoped to the authenticated owner; updates additionally include the owner as an EF concurrency token.

Dashboard reporting uses one parameterized SQL statement for a consistent snapshot of subject and overall totals. It preserves inclusive windows, future-date exclusion, latest spelling, weighted percentages, null empty percentages, and safe conversion of bigint totals to JavaScript numbers. History uses 20-record pagination.

## Deployment and data

Local development also runs Next.js in a container (`development` Dockerfile target). Source files are bind-mounted for hot reload, while dependencies and `.next` use named volumes. A lockfile fingerprint refreshes dependencies on startup when needed. `scripts/run-local.sh` waits for frontend/API health and follows their logs; signals shut down the Compose project while retaining its volumes. Its default project is `pge-local`, overridable for isolated runs.

Compose starts PostgreSQL → a one-shot migration command → API → frontend. The API itself does not apply migrations during normal startup. `/health` checks the frontend; `/api/health` checks database connectivity through the API. Production exposes only the frontend loopback port to the operator's HTTPS reverse proxy.

The frontend proxy and SSR both read `API_INTERNAL_URL` at runtime. The Docker image defaults to `http://api:8080` for Compose; deployments with a different internal API hostname override the environment variable and recreate the frontend container using the same image. No API URL build argument is needed. The frontend and API must share a network where that hostname resolves.

This is a fresh database cutover: no Prisma users, passwords or sessions are imported. The new volume names intentionally preserve old volumes. Identity tables and application tables use EF migrations and snake_case mapping. Backup the database and the Data Protection key volume separately.
