# ================== BUILD ==================
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# workspace deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./
COPY apps/package*.json ./apps/
COPY apps/web/exchange-app/package*.json ./apps/web/exchange-app/
COPY apps/packages/shared-ui/package*.json ./apps/packages/shared-ui/
COPY nginx/nginx.conf ./nginx

WORKDIR /app/apps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# source
COPY apps ./ 

# Angular build
RUN pnpm --filter @exchange/exchange-app... build --configuration=production

# ================== Nginx Web Server ==================

FROM nginx:alpine

COPY --from=builder app/apps/web/exchange-app/dist/exchange-app/browser /usr/share/nginx/html

COPY --from=builder app/conf/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]

