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

COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/src/package.json ./libs/common/dist/libs/common/src/
COPY --from=builder /app/services/proof-of-reserves-service/dist ./dist
COPY --from=builder /app/services/proof-of-reserves-service/package.json ./

EXPOSE 3009
CMD ["npm", "run", "start"]
