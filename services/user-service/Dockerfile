FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/
COPY services/user-service/package.json services/user-service/

RUN npm ci --legacy-peer-deps

COPY . .

# Build
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/user-service

# Production image
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/user-service/dist/libs/common/proto
COPY --from=builder /app/services/user-service/dist/services/user-service/src ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/package.json

RUN npm ci --workspace=@exchange/user-service --omit=dev

EXPOSE 3003
CMD ["node" , "dist/main.js"]
