FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o market-data-service ./cmd/main.go

FROM alpine:3.19
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /app/market-data-service .
COPY --from=builder /app/migrations ./migrations
EXPOSE 3005 5005 6005
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["./market-data-service"]
