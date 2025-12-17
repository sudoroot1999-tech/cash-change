FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/trading-service ./services/trading-service
COPY tsconfig.base.json ./


RUN npm ci --workspace=@exchange/common --workspace=@exchange/trading-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/trading-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/trading-service/dist ./dist
COPY --from=builder /app/services/trading-service/package.json ./

EXPOSE 3004
CMD ["npm", "run", "start"]
