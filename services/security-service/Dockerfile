FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/security-service/package.json services/security-service/

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/security-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/security-service/dist/libs/common/proto
COPY --from=builder /app/services/security-service/dist/services/security-service/src ./services/security-service/dist
COPY --from=builder /app/services/security-service/package.json ./services/security-service/package.json

RUN npm ci --workspace=@exchange/security-service --omit=dev

EXPOSE 3003
CMD ["node" , "dist/main.js"]