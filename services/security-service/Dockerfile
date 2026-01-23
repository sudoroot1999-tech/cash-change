FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
RUN pnpm install -g typescript

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/security-service/package.json services/security-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY libs ./
COPY services/security-service ./

RUN pnpm --filter @exchange/common... build
RUN pnpm --filter @exchange/security-service... build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/security-service/package.json ./services/security-service/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/common --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/security-service --frozen-lockfile

COPY --from=builder /app/libs/common/dist/ ./libs/common/dist
COPY --from=builder /app/services/security-service/dist/ ./services/security-service/dist

RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3008
WORKDIR /app/services/security-service/dist

CMD ["node" , "main.js"]