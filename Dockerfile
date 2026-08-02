FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Куда Next проксирует /api/*. Rewrites компилируются на этапе `next build`
# (routes-manifest), поэтому адрес задаётся здесь, а не переменной рантайма.
# В прод-стеке это http://api:8000 — имя сервиса из docker-compose.
ARG API_PROXY_TARGET=http://127.0.0.1:8010
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# standalone-сервер должен слушать все интерфейсы, иначе проброс порта
# из контейнера упрётся в localhost
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
