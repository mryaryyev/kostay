# One image for both apps: kostay-api and kostay-batch (same code base).

# ---------- Stage 1: build ----------
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies first so Docker can reuse this layer when only code changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:batch

# Keep only the packages needed at runtime
RUN npm prune --omit=dev

# ---------- Stage 2: run ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# --chown gives files to the "node" user while copying (no slow chown -R layer)
COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

# Uploaded images are mounted here from the host (see docker-compose.yml)
RUN mkdir uploads && chown node:node uploads
USER node

# Default: API. The batch service overrides this command.
CMD ["node", "dist/apps/kostay-api/main"]
