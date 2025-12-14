FROM golang:1.21-alpine AS builder
WORKDIR /app
CMD ["go","mod","tidy"]
# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o matching-engine ./cmd/main.go

# Production image
FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/matching-engine .

EXPOSE 3010
CMD ["./matching-engine"]
