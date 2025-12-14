FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/auth-service ./services/auth-service
COPY tsconfig.base.json ./


RUN npm ci --workspace=@exchange/common --workspace=@exchange/auth-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/auth-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/package.json ./

EXPOSE 3002
CMD ["node", "dist/main.js"]
