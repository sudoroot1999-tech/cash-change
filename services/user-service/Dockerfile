FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
RUN pnpm install -g typescript

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/user-service/package.json services/user-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

# Build
RUN pnpm --filter @exchange/common... build
RUN pnpm --filter @exchange/user-service... build

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/user-service/package.json ./services/user-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/common --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/user-service --frozen-lockfile

COPY --from=builder /app/libs/common/dist/ ./libs/common/dist
COPY --from=builder /app/services/user-service/dist/ ./services/user-service/

RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3001
WORKDIR /app/services/user-service

CMD ["node" , "main.js"]
