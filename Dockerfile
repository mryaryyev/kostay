# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN ./node_modules/.bin/tsc -p apps/kostay-api/tsconfig.app.json --noEmit && \
    ./node_modules/.bin/tsc -p apps/kostay-batch/tsconfig.app.json --noEmit
RUN npm run build -- kostay-api && npm run build -- kostay-batch && \
    test -f dist/apps/kostay-api/main.js && test -f dist/apps/kostay-batch/main.js
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT_API=3007 PORT_BATCH=3008 TZ=Asia/Seoul
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json
RUN mkdir -p uploads/member uploads/property uploads/article && chown -R node:node uploads
USER node
EXPOSE 3007
CMD ["node", "dist/apps/kostay-api/main.js"]
