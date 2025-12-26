FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY libs/common ./libs/common
COPY services/wallet-service ./services/wallet-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci 
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/wallet-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/services/wallet-service/dist/services/wallet-service ./services/wallet-service/dist
COPY --from=builder /app/services/wallet-service/dist/libs ./libs/
COPY services/wallet-service/package.json ./services/wallet-service/package.json
COPY libs/common/package.json ./libs/common/package.json

RUN npm ci --workspace=@exchange/wallet-service --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start","--workspace=@exchange/wallet-service"]
