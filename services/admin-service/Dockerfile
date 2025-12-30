FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
RUN pnpm install -g typescript

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/admin-service/package.json services/admin-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @exchange/common... build
RUN pnpm --filter @exchange/admin-service... build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/admin-service/package.json ./services/admin-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/common --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/admin-service --frozen-lockfile

COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/services/admin-service/dist/ ./services/admin-service/

RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3011
WORKDIR /app/services/admin-service

CMD ["node", "main.js"]

