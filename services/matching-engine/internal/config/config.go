package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	GRPCPort      string
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
		Port:          getEnv("PORT","3010")
		GRPCPort:      getEnv("GRPC_PORT", "5010"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://exchange_user:exchange_dev_password@localhost:5432/exchange?sslmode=disable"),
		KafkaBrokers:  strings.Split(getEnv("KAFKA_BROKERS", "localhost:29092"), ","),
		ConsumerGroup: getEnv("CONSUMER_GROUP", "matching-engine"),
		WebSocketPort: getEnv("WEBSOCKET_PORT", "6010"),
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RabbitMQURL:   getEnv("RABBITMQ_URL", "amqp://exchange:rabbitmq_dev_password@localhost:5672/"),
		InstanceID:    getEnv("INSTANCE_ID", "matching-engine-1"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
