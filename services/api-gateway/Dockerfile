FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/api-gateway/package.json services/api-gateway/
COPY tsconfig.base.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/api-gateway

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/auth-service/dist/libs/common/proto
COPY --from=builder /app/services/api-gateway/dist/services/api-gateway/src ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/package.json

RUN npm ci --workspace=@exchange/api-gateway --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start", "--workspace=@exchange/api-gateway"]
