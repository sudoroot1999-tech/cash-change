FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY libs/common ./libs/common
COPY services/api-gateway ./services/api-gateway
RUN npm ci --workspace=@exchange/common --workspace=@exchange/api-gateway
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/api-gateway

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
