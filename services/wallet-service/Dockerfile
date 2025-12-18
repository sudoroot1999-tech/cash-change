FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules
COPY libs/common ./libs/common
COPY services/wallet-service ./services/wallet-service
COPY tsconfig.base.json ./


RUN npm ci --workspace=@exchange/common --workspace=@exchange/wallet-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/wallet-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/wallet-service/dist ./dist
COPY --from=builder /app/services/wallet-service/package.json ./

EXPOSE 3003
CMD ["npm", "run", "start"]
