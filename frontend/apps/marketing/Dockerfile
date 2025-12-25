# ================== BUILD ==================
FROM node:20-slim AS builder

WORKDIR /app

# workspace deps
COPY frontend/package*.json ./frontend/
COPY frontend/apps/marketing/package*.json ./frontend/apps/marketing/
COPY frontend/packages/shared-ui/package*.json ./frontend/packages/shared-ui/

WORKDIR /app/frontend
RUN npm install

# source
COPY frontend ./ 

# Next.js build (standalone)
RUN npm run build --workspace=@exchange/marketing


# ================== RUNTIME ==================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV PORT=3100

WORKDIR /app

COPY --from=builder /app/frontend/apps/marketing/.next/standalone ./
COPY --from=builder /app/frontend/apps/marketing/.next/standalone/apps/marketing ./
COPY --from=builder /app/frontend/apps/marketing/.next/static ./.next/static
COPY --from=builder /app/frontend/apps/marketing/public ./public


EXPOSE 3100

CMD ["node", "server.js"]
