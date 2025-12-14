FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY libs/common ./libs/common
COPY services/notification-service ./services/notification-service
COPY tsconfig.base.json ./

RUN npm ci --workspace=@exchange/common --workspace=@exchange/notification-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/notification-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/package.json ./

EXPOSE 3006
CMD ["node", "dist/main.js"]
