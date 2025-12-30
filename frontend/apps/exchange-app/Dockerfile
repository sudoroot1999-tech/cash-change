# ================== BUILD ==================
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# workspace deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY frontend/package*.json ./frontend/
COPY frontend/apps/exchange-app/package*.json ./frontend/apps/exchange-app/
COPY frontend/packages/shared-ui/package*.json ./frontend/packages/shared-ui/

WORKDIR /app/frontend
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# source
COPY frontend ./ 

# Angular build
RUN pnpm --filter @exchange/exchange-app... build --configuration=production

# ================== DIST ONLY ==================
FROM alpine:3.19 AS dist

WORKDIR /dist

COPY --from=builder /app/frontend/apps/exchange-app/dist/exchange-app/browser/  ./

