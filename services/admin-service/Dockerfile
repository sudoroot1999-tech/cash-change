FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY services/admin-service/package*.json ./services/admin-service/
COPY libs/common/package*.json ./libs/common/

RUN npm ci --legacy-peer-deps

# Copy source code
COPY libs/common ./libs/common
COPY services/admin-service ./services/admin-service

WORKDIR /app/services/admin-service

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/libs/common ./libs/common
COPY --from=base /app/services/admin-service/dist ./dist
COPY --from=base /app/services/admin-service/package*.json ./

EXPOSE 3011

CMD ["node", "dist/main.js"]

