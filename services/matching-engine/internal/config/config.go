package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	KafkaBrokers  []string
	ConsumerGroup string
	WebSocketPort string
	RedisURL      string
	RabbitMQURL   string
	InstanceID    string
}

func Load() *Config {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/trading_db?sslmode=disable"),
		KafkaBrokers:  strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		ConsumerGroup: getEnv("CONSUMER_GROUP", "matching-engine"),
		WebSocketPort: getEnv("WEBSOCKET_PORT", "8080"),
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RabbitMQURL:   getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		InstanceID:    getEnv("INSTANCE_ID", "matching-engine-1"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
