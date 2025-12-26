FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/security-service ./services/security-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci 
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/security-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/services/security-service/dist/services/security-service ./services/security-service/dist
COPY --from=builder /app/services/security-service/dist/libs ./libs/
COPY services/security-service/package.json ./services/security-service/package.json
COPY libs/common/package.json ./libs/common/package.json

RUN npm ci --workspace=@exchange/security-service --omit=dev

EXPOSE 3008
CMD ["npm", "run", "start","--workspace=@exchange/security-service"]