# syntax=docker/dockerfile:1
FROM node:22-alpine AS development
WORKDIR /app
ARG LOCAL_UID=1000
ARG LOCAL_GID=1000
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1 npm_config_cache=/tmp/npm-cache
RUN mkdir -p /app/node_modules /app/.next && chown -R ${LOCAL_UID}:${LOCAL_GID} /app
COPY --chown=${LOCAL_UID}:${LOCAL_GID} package.json package-lock.json ./
COPY --chmod=755 scripts/start-dev-frontend.sh /usr/local/bin/start-dev-frontend
USER ${LOCAL_UID}:${LOCAL_GID}
RUN npm ci && sha256sum package-lock.json > node_modules/.package-lock.sha256
EXPOSE 3000
CMD ["/usr/local/bin/start-dev-frontend"]

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Next.js rewrites are compiled at build time. Compose uses this stable service name.
ARG API_INTERNAL_URL=http://api:8080
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 API_INTERNAL_URL=http://api:8080
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
