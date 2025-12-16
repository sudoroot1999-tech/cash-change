# Crypto Exchange Platform

A next-generation cryptocurrency exchange platform with microservices architecture.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for matching engine development)

### Start Development Environment

```bash
# 1. Copy environment file
cp .env.example .env

# 2. install all dependencies and package-lock.json
npm install --legacy-peer-deps

# 3. Start all services
docker-compose up -d

# 4. View logs
docker-compose logs -f

# 5. Stop services
docker-compose down
```

### Service Endpoints

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Main API entry point |
| User Service | 3001 | User management |
| Auth Service | 3002 | Authentication |
| Wallet Service | 3003 | Wallet & balances |
| Trading Service | 3004 | Order management |
| Market Data | 3005 | Market data |
| Matching Engine | 3010 | Order matching |
| PostgreSQL | 5432 | Main database |
| TimescaleDB | 5433 | Time-series data |
| Redis | 6379 | Caching |
| RabbitMQ | 5672 | Message broker |
| RabbitMQ UI | 15672 | Management UI |

### API Documentation

Once running, access Swagger docs at:
- http://localhost:3000/docs (Gateway)
- http://localhost:3001/docs (User Service)
- http://localhost:3002/docs (Auth Service)

## 📁 Project Structure

```
crypto-exchange-platform/
├── libs/                    # Shared libraries
│   └── common/             # Types, utils, constants
├── services/
│   ├── api-gateway/        # API Gateway (NestJS)
│   ├── user-service/       # User management (NestJS)
│   ├── auth-service/       # Authentication (NestJS)
│   ├── wallet-service/     # Wallet management (NestJS)
│   ├── trading-service/    # Trading (NestJS)
│   └── matching-engine/    # Order matching (Go)
├── docker-compose.yml
└── package.json
```

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Run Individual Service
```bash
# NestJS services
cd services/user-service
npm run dev

# Go matching engine
cd services/matching-engine
go run cmd/main.go
```

### Run Tests
```bash
npm run test:all
```

## 🔐 Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `RABBITMQ_URL` - RabbitMQ connection

## 📝 API Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecureP@ss123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecureP@ss123"}'
```

### Place Order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","side":"buy","type":"limit","price":"45000","quantity":"0.5"}'
```

## 📄 License

Proprietary - All rights reserved.
