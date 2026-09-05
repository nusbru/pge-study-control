# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS production-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM deps AS builder
COPY . .
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build' npm exec -- prisma generate
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build' \
  AUTH_SECRET='build-placeholder-not-used-at-runtime' \
  npm run build

FROM production-deps AS migrator
ENV NODE_ENV=production
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs prisma.config.ts ./prisma.config.ts
USER nextjs
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM production-deps AS runner
ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node server.js"]
