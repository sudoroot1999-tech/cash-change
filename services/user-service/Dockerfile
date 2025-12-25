FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY libs/common ./libs/common
COPY services/user-service ./services/user-service
COPY tsconfig.base.json ./

# Install ts compiler
RUN npm install -g typescript
# Install dependencies
RUN npm ci --workspace=@exchange/common --workspace=@exchange/user-service
# Build
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/user-service

# Production image
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/dist/libs/common/src/
COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./

EXPOSE 3001
CMD ["npm", "run", "start"]
