# ---- deps ----
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- run ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next standalone (server.js) escuta em process.env.HOSTNAME; o Docker define
# HOSTNAME com o ID do container em runtime (sobrescreve ENV), impedindo o proxy
# do Railway de alcancar o app. Forcamos 0.0.0.0 no proprio comando de start.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
# node_modules completo (superset do standalone): necessário para o CLI do Prisma
# (migrate deploy) que depende de @prisma/config -> effect e outras transitivas.
COPY --from=build /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
# Roda migrations e depois sobe o app (ver docker-entrypoint.sh).
CMD ["sh", "./docker-entrypoint.sh"]
