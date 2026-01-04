package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/trading-platform/matching-engine/internal/api"
	"github.com/trading-platform/matching-engine/internal/config"
	"github.com/trading-platform/matching-engine/internal/engine"
	grpcserver "github.com/trading-platform/matching-engine/internal/grpc"
	"github.com/trading-platform/matching-engine/internal/kafka"
	"github.com/trading-platform/matching-engine/internal/repository"
	"github.com/trading-platform/matching-engine/internal/websocket"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize database repository
	repo, err := repository.NewPostgresRepository(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer repo.Close()

	// Initialize Kafka producer
	kafkaProducer, err := kafka.NewProducer(cfg.KafkaBrokers)
	if err != nil {
		logger.Fatal("Failed to initialize Kafka producer", zap.Error(err))
	}
	defer kafkaProducer.Close()

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()

	// Initialize matching engine
	matchingEngine := engine.NewMatchingEngine(repo, kafkaProducer, wsHub, logger)
	
	// Start matching engine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go matchingEngine.Start(ctx)

	// Start WebSocket server
	go websocket.StartServer(wsHub, cfg.WebSocketPort, logger)

	// Start Kafka consumer
	consumer, err := kafka.NewConsumer(cfg.KafkaBrokers, cfg.ConsumerGroup, matchingEngine)
	if err != nil {
		logger.Fatal("Failed to initialize Kafka consumer", zap.Error(err))
	}
	go consumer.Start(ctx)

	// Start HTTP API server
	apiServer := api.NewServer(logger)
	go func() {
		if err := apiServer.Start("8080"); err != nil {
			logger.Error("HTTP API server failed", zap.Error(err))
		}
	}()

	// Start gRPC server
	grpcServer := grpcserver.NewServer(matchingEngine, logger)
	go func() {
		if err := grpcServer.Start(cfg.GRPCPort); err != nil {
			logger.Error("gRPC server failed", zap.Error(err))
		}
	}()

	logger.Info("Matching engine started successfully",
		zap.String("grpc_port", cfg.GRPCPort),
		zap.String("websocket_port", cfg.WebSocketPort),
		zap.String("http_api_port", "8080"),
		zap.String("swagger_docs", "http://localhost:8080/swagger/index.html"),
		zap.Strings("kafka_brokers", cfg.KafkaBrokers),
	)

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	logger.Info("Shutting down matching engine...")
	cancel()
	consumer.Close()
}
