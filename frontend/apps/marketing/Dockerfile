# ================== BUILD ==================
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files
COPY frontend/package.json ./frontend/
COPY frontend/apps/marketing/package.json ./frontend/apps/marketing/
COPY frontend/packages/shared-ui/package.json ./frontend/packages/shared-ui/

# Install dependencies
WORKDIR /app/frontend
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY frontend ./

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
COPY frontend/package.json ./frontend/
COPY frontend/apps/marketing/package.json ./frontend/apps/marketing/
COPY frontend/packages/shared-ui/package.json ./frontend/packages/shared-ui/

# Install production dependencies
WORKDIR /app/frontend
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/marketing... --frozen-lockfile

# Copy the standalone build from builder
COPY --from=builder /app/frontend/apps/marketing/.next/standalone/apps/marketing ./apps/marketing

# Copy static assets
COPY --from=builder /app/frontend/apps/marketing/.next/static ./apps/marketing/.next/static
# COPY --from=builder /app/frontend/apps/marketing/public ./apps/marketing/public

# Set working directory to where server.js exists
WORKDIR /app/frontend/apps/marketing
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3100
CMD ["node", "server.js"]