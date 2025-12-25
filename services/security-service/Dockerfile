FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/security-service ./services/security-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci --workspace=@exchange/common --workspace=@exchange/security-service
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/security-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/common/src/package.json ./libs/common/dist/libs/common/src/
COPY --from=builder /app/services/security-service/dist ./dist
COPY --from=builder /app/services/security-service/package.json ./

EXPOSE 3008
CMD ["npm", "run", "start"]
