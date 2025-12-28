FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY services/admin-service/package*.json ./services/admin-service/
COPY libs/common/package*.json ./libs/common/

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/admin-service

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/services/admin-service/dist/services/admin-service/src ./services/admin-service/dist
COPY --from=builder /app/services/admin-service/package.json ./services/admin-service/package.json

RUN npm ci --workspace=@exchange/admin-service --omit=dev

EXPOSE 3011

CMD ["node", "dist/main.js"]

