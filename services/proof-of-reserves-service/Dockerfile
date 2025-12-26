FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/proof-of-reserves-service ./services/proof-of-reserves-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci --workspace=@exchange/common --workspace=@exchange/proof-of-reserves-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/proof-of-reserves-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/services/proof-of-reserves-service/dist ./services/proof-of-reserves-service/dist
COPY --from=builder /app/services/proof-of-reserves-service/package.json ./services/proof-of-reserves-service/package.json

RUN npm ci --workspace=@exchange/proof-of-reserves-service --omit=dev

EXPOSE 3009
CMD ["npm", "run", "start","--workspace=@exchange/proof-of-reserves-service"]