FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/compliance-service/package.json services/compliance-service/
COPY tsconfig.base.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/compliance-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/compliance-service/dist/libs/common/proto
COPY --from=builder /app/services/compliance-service/dist/services/compliance-service/src ./services/compliance-service/dist
COPY --from=builder /app/services/compliance-service/package.json ./services/compliance-service/package.json

RUN npm ci --workspace=@exchange/compliance-service --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start", "--workspace=@exchange/compliance-service"]

