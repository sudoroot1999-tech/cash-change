# ================== BUILD ==================
FROM node:20-slim AS builder

WORKDIR /app

# workspace deps
COPY frontend/package*.json ./frontend/
COPY frontend/apps/exchange-app/package*.json ./frontend/apps/exchange-app/
COPY frontend/packages/shared-ui/package*.json ./frontend/packages/shared-ui/

WORKDIR /app/frontend
RUN npm install

# source
COPY frontend ./ 

# Angular build
RUN npm run build --workspace=@exchange/exchange-app -- --configuration=production

# ================== DIST ONLY ==================
FROM alpine:3.19 AS dist

WORKDIR /dist

COPY --from=builder /app/frontend/apps/exchange-app/dist/exchange-app/browser/  ./

