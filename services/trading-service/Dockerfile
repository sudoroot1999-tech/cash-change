FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g typescript
COPY package*.json ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/trading-service/package.json services/trading-service/package.json

RUN npm install

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/trading-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/trading-service/dist/libs/common/proto
COPY --from=builder /app/services/trading-service/dist/services/trading-service/src ./services/trading-service/dist
COPY --from=builder /app/services/trading-service/package.json ./services/trading-service/package.json

RUN npm ci --workspace=@exchange/trading-service --omit=dev

EXPOSE 3003
CMD ["node" , "dist/main.js"]
