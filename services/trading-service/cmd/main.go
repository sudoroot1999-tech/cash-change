package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/trading-platform/trading-service/internal/api"
	"github.com/trading-platform/trading-service/internal/cache"
	"github.com/trading-platform/trading-service/internal/config"
	"github.com/trading-platform/trading-service/internal/consumers"
	"github.com/trading-platform/trading-service/internal/grpc"
	"github.com/trading-platform/trading-service/internal/messaging"
	"github.com/trading-platform/trading-service/internal/repository"
	"github.com/trading-platform/trading-service/internal/services"
	"github.com/trading-platform/trading-service/internal/websocket"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Info("🚀 Starting Trading Service (Go)")

	// Load configuration
	cfg := config.Load()

	// Initialize database
	repo, err := repository.NewPostgresRepository(cfg.DatabaseURL, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer repo.Close()

	// Initialize multi-layer cache
	cacheClient, err := cache.NewMultiLayerCache(cfg.RedisURL, cfg.RedisPassword, cfg.RedisDB, logger)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer cacheClient.Close()

	// Initialize RabbitMQ
	rabbitmq, err := messaging.NewRabbitMQClient(cfg.RabbitMQURL, logger)
	if err != nil {
		logger.Fatal("Failed to connect to RabbitMQ", zap.Error(err))
	}
	defer rabbitmq.Close()

	// Initialize Kafka producer
	kafkaProducer := messaging.NewKafkaProducer(cfg.KafkaBrokers, logger)
	defer kafkaProducer.Close()

	// Initialize Kafka consumer
	kafkaConsumer := messaging.NewKafkaConsumer(cfg.KafkaBrokers, cfg.KafkaConsumerGroup, logger)
	defer kafkaConsumer.Close()

	// Initialize gRPC clients (for read-only operations: stats, health, config, ping)
	grpcClients, err := grpc.NewServiceClients(&grpc.ClientConfig{
		MatchingEngineAddr: cfg.MatchingEngineGRPC,
		MarketDataAddr:     cfg.MarketDataGRPC,
		WalletAddr:         cfg.WalletGRPC,
		SocialTradingAddr:  cfg.SocialTradingGRPC,
	}, logger)
	if err != nil {
		logger.Warn("Some gRPC connections failed", zap.Error(err))
	}
	defer grpcClients.Close()

	// Initialize trading service (no direct gRPC to matching engine for orders - uses async messaging)
	tradingService := services.NewTradingService(
		repo,
		cacheClient,
		rabbitmq,
		kafkaProducer,
		cfg.OrderWorkers,
		cfg.TradeWorkers,
		cfg.PositionWorkers,
		logger,
	)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start trading service
	tradingService.Start(ctx)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()

	// Initialize consumers
	matchingConsumer := consumers.NewMatchingEngineConsumer(
		rabbitmq, kafkaConsumer, repo, cacheClient, nil, nil, logger,
	)
	if err := matchingConsumer.Start(ctx); err != nil {
		logger.Error("Failed to start matching engine consumer", zap.Error(err))
	}

	socialConsumer := consumers.NewSocialTradingConsumer(rabbitmq, kafkaConsumer, nil, logger)
	if err := socialConsumer.Start(ctx); err != nil {
		logger.Error("Failed to start social trading consumer", zap.Error(err))
	}

	walletConsumer := consumers.NewWalletConsumer(rabbitmq, kafkaConsumer, logger)
	if err := walletConsumer.Start(ctx); err != nil {
		logger.Error("Failed to start wallet consumer", zap.Error(err))
	}

	marketDataConsumer := consumers.NewMarketDataConsumer(kafkaConsumer, cacheClient, logger)
	if err := marketDataConsumer.Start(ctx); err != nil {
		logger.Error("Failed to start market data consumer", zap.Error(err))
	}

	// Start HTTP server
	httpServer := api.NewHTTPServer(tradingService, logger)
	go func() {
		if err := httpServer.Start(cfg.HTTPPort); err != nil {
			logger.Error("HTTP server failed", zap.Error(err))
		}
	}()

	// Start WebSocket server
	wsServer := websocket.NewServer(wsHub, logger)
	go func() {
		if err := wsServer.Start(cfg.WebSocketPort); err != nil {
			logger.Error("WebSocket server failed", zap.Error(err))
		}
	}()

	logger.Info("✅ Trading Service started successfully",
		zap.String("http_port", cfg.HTTPPort),
		zap.String("websocket_port", cfg.WebSocketPort),
		zap.String("grpc_port", cfg.GRPCPort),
		zap.String("instance_id", cfg.InstanceID),
	)

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	logger.Info("Shutting down Trading Service...")
	cancel()
	tradingService.Stop()
	logger.Info("Trading Service stopped")
}
