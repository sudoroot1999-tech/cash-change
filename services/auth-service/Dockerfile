FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/auth-service ./services/auth-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci 
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/auth-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/services/auth-service/dist/services/auth-service ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/dist/libs ./libs/
COPY services/auth-service/package.json ./services/auth-service/package.json
COPY libs/common/package.json ./libs/common/package.json

RUN npm ci --workspace=@exchange/auth-service --omit=dev

EXPOSE 3002
CMD ["npm", "run","start","--workspace=@exchange/auth-service"]