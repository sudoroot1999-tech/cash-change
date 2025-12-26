FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/common ./libs/common
COPY services/compliance-service ./services/compliance-service
COPY tsconfig.base.json ./

RUN npm install -g typescript
RUN npm ci 
RUN npm run build --workspace=@exchange/common
RUN npm run build --workspace=@exchange/compliance-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/services/compliance-service/dist/services/compliance-service ./services/compliance-service/dist
COPY --from=builder /app/services/compliance-service/dist/libs ./libs/
COPY services/compliance-service/package.json ./services/compliance-service/package.json
COPY libs/common/package.json ./libs/common/package.json

RUN npm ci --workspace=@exchange/compliance-service --omit=dev

EXPOSE 3007
CMD ["npm", "run", "start","--workspace=@exchange/compliance-service"]
