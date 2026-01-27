# ================== BUILD ==================
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files
COPY apps/package.json ./apps/
COPY apps/web/marketing/package.json ./apps/web/marketing/
COPY apps/packages/shared-ui/package.json ./apps/packages/shared-ui/

# Install dependencies
WORKDIR /app/apps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY apps ./

# Build
RUN pnpm --filter @exchange/marketing... build


# ================== RUNTIME ==================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
RUN corepack enable

ENV NODE_ENV=production
ENV PORT=3100
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/package.json ./apps/
COPY apps/web/marketing/package.json ./apps/web/marketing/
COPY apps/packages/shared-ui/package.json ./apps/packages/shared-ui/

# Install production dependencies
WORKDIR /app/apps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/marketing... --frozen-lockfile

# Copy the standalone build from builder
COPY --from=builder /app/apps/web/marketing/.next/standalone/web/marketing ./web/marketing

# Copy static assets
COPY --from=builder /app/apps/web/marketing/.next/static ./web/marketing/.next/static
# COPY --from=builder /app/apps/web/marketing/public ./web/marketing/public

# Set working directory to where server.js exists
WORKDIR /app/apps/web/marketing
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3100
CMD ["node", "server.js"]