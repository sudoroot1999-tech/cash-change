FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY frontend/package*.json ./frontend/
COPY frontend/apps/marketing/package*.json ./frontend/apps/marketing/
COPY frontend/packages/shared-ui/package*.json ./frontend/packages/shared-ui/
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build --workspace=@exchange/marketing

FROM node:20-alpine AS execution
WORKDIR /app/frontend/apps/marketing
ENV NODE_ENV=production
COPY --from=builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=builder /app/frontend/apps/marketing/.next ./.next
COPY --from=builder /app/frontend/apps/marketing/public ./public
COPY --from=builder /app/frontend/apps/marketing/package.json ./package.json
COPY --from=builder /app/frontend/apps/marketing/next.config.js ./next.config.js

EXPOSE 3100
CMD ["npm", "run", "start", "--", "-p", "3100"]
