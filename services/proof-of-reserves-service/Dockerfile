FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g typescript
COPY package*.json ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/proof-of-reserves-service/package.json services/proof-of-reserves-service/package.json

RUN npm install

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/proof-of-reserves-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/proof-of-reserves-service/dist/libs/common/proto
COPY --from=builder /app/services/proof-of-reserves-service/dist/services/proof-of-reserves-service/src ./services/proof-of-reserves-service/dist
COPY --from=builder /app/services/proof-of-reserves-service/package.json ./services/proof-of-reserves-service/package.json

RUN npm ci --workspace=@exchange/proof-of-reserves-service --omit=dev

EXPOSE 3003
CMD ["node" , "dist/main.js"]