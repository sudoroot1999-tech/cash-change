FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/trading-service ./services/trading-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci 
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/trading-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/trading-service/dist ./services/trading-service/dist
COPY --from=builder /app/services/trading-service/package.json ./services/trading-service/package.json

RUN npm ci --workspace=@exchange/trading-service --omit=dev

EXPOSE 3004
CMD ["npm", "run", "start","--workspace=@exchange/trading-service"]
