FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g typescript

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/auth-service ./services/auth-service
COPY tsconfig.base.json ./

RUN npm install --legacy-peer-deps
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/auth-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/proto ./libs/common/proto
COPY --from=builder /app/libs/common/proto ./services/auth-service/dist/libs/common/proto
COPY --from=builder /app/services/auth-service/dist/services/auth-service/src ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/package.json

RUN npm ci --workspace=@exchange/auth-service --omit=dev

EXPOSE 3003
CMD ["npm", "run", "start", "--workspace=@exchange/auth-service"]