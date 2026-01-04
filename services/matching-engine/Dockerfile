FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o matching-engine ./cmd/main.go

# Production image
FROM alpine:3.19
WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/matching-engine .
COPY --from=builder /app/migrations ./migrations

EXPOSE 3010 5010 6010
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["./matching-engine"]
