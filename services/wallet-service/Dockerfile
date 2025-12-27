FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/wallet-service/package.json services/wallet-service/

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/wallet-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/wallet-service/dist/libs/common/proto
COPY --from=builder /app/services/wallet-service/dist/services/wallet-service/src ./services/wallet-service/dist
COPY --from=builder /app/services/wallet-service/package.json ./services/wallet-service/package.json

RUN npm ci --workspace=@exchange/wallet-service --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start", "--workspace=@exchange/wallet-service"]
