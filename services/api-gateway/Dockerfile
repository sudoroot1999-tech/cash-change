FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
RUN pnpm install -g typescript

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/api-gateway/package.json services/api-gateway/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @exchange/common... build
RUN pnpm --filter @exchange/api-gateway... build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/common --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --filter @exchange/api-gateway --frozen-lockfile

COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/services/api-gateway/dist/ ./services/api-gateway/

RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3003
WORKDIR /app/services/api-gateway

CMD ["node" , "main.js"]
