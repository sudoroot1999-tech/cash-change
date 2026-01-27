package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DatabaseURL string

	// Redis
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// RabbitMQ
	RabbitMQURL string

	// Kafka
	KafkaBrokers      []string
	KafkaConsumerGroup string

	// gRPC Services
	// NOTE: Matching Engine gRPC is READ-ONLY (stats, health, config, ping)
	// All order flow uses async messaging (RabbitMQ/Kafka)
	MatchingEngineGRPC string // READ-ONLY: stats, health, config, ping
	MarketDataGRPC     string
	WalletGRPC         string
	SocialTradingGRPC  string

	// HTTP Services (fallback)
	MarketDataURL    string
	WalletURL        string
	SocialTradingURL string

	// Server
	HTTPPort      string
	GRPCPort      string
	WebSocketPort string

	// Instance
	InstanceID string

	// Cache TTL
	CacheTTLTicker    int
	CacheTTLOrderbook int
	CacheTTLPosition  int

	// Workers
	OrderWorkers    int
	TradeWorkers    int
	PositionWorkers int
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/trading_db?sslmode=disable"),
		RedisURL:            getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", ""),
		RedisDB:             getEnvInt("REDIS_DB", 0),
		RabbitMQURL:         getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		KafkaBrokers:       strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		KafkaConsumerGroup: getEnv("KAFKA_CONSUMER_GROUP", "trading-service"),
		// Matching Engine gRPC is READ-ONLY (stats, health, config, ping)
		MatchingEngineGRPC: getEnv("MATCHING_ENGINE_GRPC", "localhost:50051"),
		MarketDataGRPC:     getEnv("MARKET_DATA_GRPC", "localhost:50052"),
		WalletGRPC:         getEnv("WALLET_GRPC", "localhost:50053"),
		SocialTradingGRPC:  getEnv("SOCIAL_TRADING_GRPC", "localhost:50054"),
		MarketDataURL:      getEnv("MARKET_DATA_URL", "http://localhost:3006"),
		WalletURL:          getEnv("WALLET_URL", "http://localhost:3004"),
		SocialTradingURL:   getEnv("SOCIAL_TRADING_URL", "http://localhost:3010"),
		HTTPPort:            getEnv("HTTP_PORT", "8081"),
		GRPCPort:            getEnv("GRPC_PORT", "50055"),
		WebSocketPort:       getEnv("WEBSOCKET_PORT", "8082"),
		InstanceID:          getEnv("INSTANCE_ID", "trading-service-1"),
		CacheTTLTicker:      getEnvInt("CACHE_TTL_TICKER", 5),
		CacheTTLOrderbook:   getEnvInt("CACHE_TTL_ORDERBOOK", 1),
		CacheTTLPosition:    getEnvInt("CACHE_TTL_POSITION", 10),
		OrderWorkers:        getEnvInt("ORDER_WORKERS", 10),
		TradeWorkers:        getEnvInt("TRADE_WORKERS", 5),
		PositionWorkers:     getEnvInt("POSITION_WORKERS", 3),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}
