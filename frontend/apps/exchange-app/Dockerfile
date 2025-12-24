FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY frontend/package*.json ./frontend/
COPY frontend/apps/exchange-app/package*.json ./frontend/apps/exchange-app/
COPY frontend/packages/shared-ui/package*.json ./frontend/packages/shared-ui/
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build --workspace=@exchange/exchange-app

FROM node:20-alpine AS execution
WORKDIR /app/frontend/apps/exchange-app
ENV NODE_ENV=production
COPY --from=builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=builder /app/frontend/apps/exchange-app/dist/exchange-app/browser ./dist
COPY --from=builder /app/frontend/apps/exchange-app/package.json ./package.json

EXPOSE 4200
# For development/staging we can use a simple static server or just serve with ng serve if we want dev mode
# But since this is a Dockerfile, we'll use a simple node server or similar if not using Nginx directly.
# However, the user wants Nginx to handle the routing. So this container just needs to serve the files.
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "4200"]
