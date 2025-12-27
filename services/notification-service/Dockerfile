FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/notification-service/package.json services/notification-service/
COPY tsconfig.base.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/notification-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/notification-service/dist/libs/common/proto
COPY --from=builder /app/services/notification-service/dist/services/notification-service/src ./services/notification-service/dist
COPY --from=builder /app/services/notification-service/package.json ./services/notification-service/package.json

RUN npm ci --workspace=@exchange/notification-service --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start", "--workspace=@exchange/notification-service"]
