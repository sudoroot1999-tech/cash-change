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
	KafkaBrokers       []string
	KafkaConsumerGroup string

	// gRPC Services
	// NOTE: Matching Engine gRPC is READ-ONLY (stats, health, config, ping)
	// Market data updates come via async messaging (RabbitMQ/Kafka)
	MatchingEngineGRPC string // READ-ONLY: stats, health, config, ping
	TradingGRPC        string

	// Server Ports
	HTTPPort      string
	GRPCPort      string
	WebSocketPort string

	// Instance
	InstanceID string

	// Data Providers
	CoinGeckoAPIURL string
	CoinGeckoAPIKey string
	BinanceAPIURL   string
	BinanceWSURL    string

	// Cache TTL (seconds)
	CacheTTLTicker    int
	CacheTTLOrderbook int
	CacheTTLKline     int
	CacheTTLMarketCap int

	// Workers
	TickerWorkers    int
	KlineWorkers     int
	OrderbookWorkers int

	// Sync Intervals (seconds)
	TickerSyncInterval    int
	KlineSyncInterval     int
	MarketCapSyncInterval int

	// Feature Flags
	EnableBinance   bool
	EnableCoinGecko bool
	EnableNFTData   bool
	EnableRWAData   bool
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		// Database
		DatabaseURL: getEnv("DATABASE_URL", "postgres://exchange_user:exchange_dev_password@localhost:5432/exchange?sslmode=disable"),

		// Redis
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", "redis_dev_password"),
		// RedisDB:       getEnvInt("REDIS_DB", 0),

		// RabbitMQ
		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://exchange:rabbitmq_dev_password@localhost:5672"),

		// Kafka
		KafkaBrokers:       strings.Split(getEnv("KAFKA_BROKERS", "localhost:29092"), ","),
		KafkaConsumerGroup: getEnv("KAFKA_CONSUMER_GROUP", "market-data-service"),

		// gRPC Services
		// Matching Engine gRPC is READ-ONLY (stats, health, config, ping)
		MatchingEngineGRPC: getEnv("MATCHING_ENGINE_GRPC", "localhost:5010"),
		TradingGRPC:        getEnv("TRADING_GRPC", "localhost:5004"),

		// Server Ports
		HTTPPort:      getEnv("HTTP_PORT", "3005"),
		GRPCPort:      getEnv("GRPC_PORT", "5005"),
		WebSocketPort: getEnv("WEBSOCKET_PORT", "6005"),

		// Instance
		InstanceID: getEnv("INSTANCE_ID", "market-data-1"),

		// Data Providers
		CoinGeckoAPIURL: getEnv("COINGECKO_API_URL", "https://api.coingecko.com/api/v3"),
		CoinGeckoAPIKey: getEnv("COINGECKO_API_KEY", ""),
		BinanceAPIURL:   getEnv("BINANCE_API_URL", "https://api.binance.com"),
		BinanceWSURL:    getEnv("BINANCE_WS_URL", "wss://stream.binance.com:9443/ws"),

		// Cache TTL
		CacheTTLTicker:    getEnvInt("CACHE_TTL_TICKER", 5),
		CacheTTLOrderbook: getEnvInt("CACHE_TTL_ORDERBOOK", 1),
		CacheTTLKline:     getEnvInt("CACHE_TTL_KLINE", 60),
		CacheTTLMarketCap: getEnvInt("CACHE_TTL_MARKET_CAP", 300),

		// Workers
		TickerWorkers:    getEnvInt("TICKER_WORKERS", 5),
		KlineWorkers:     getEnvInt("KLINE_WORKERS", 3),
		OrderbookWorkers: getEnvInt("ORDERBOOK_WORKERS", 5),

		// Sync Intervals
		TickerSyncInterval:    getEnvInt("TICKER_SYNC_INTERVAL", 5),
		KlineSyncInterval:     getEnvInt("KLINE_SYNC_INTERVAL", 60),
		MarketCapSyncInterval: getEnvInt("MARKET_CAP_SYNC_INTERVAL", 300),

		// Feature Flags
		EnableBinance:   getEnvBool("ENABLE_BINANCE", true),
		EnableCoinGecko: getEnvBool("ENABLE_COINGECKO", true),
		EnableNFTData:   getEnvBool("ENABLE_NFT_DATA", false),
		EnableRWAData:   getEnvBool("ENABLE_RWA_DATA", false),
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

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}
