FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY libs/common ./libs/common
COPY services/api-gateway ./services/api-gateway
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/api-gateway

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/services/api-gateway/dist/services/api-gateway ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/dist/libs ./libs/
COPY services/api-gateway/package.json ./services/api-gateway/package.json
COPY libs/common/package.json ./libs/common/package.json

RUN npm ci --workspace=@exchange/api-gateway --omit=dev

EXPOSE 3000
CMD ["npm", "run","start","--workspace=@exchange/api-gateway"]
