package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/trading-platform/market-data-service/internal/api"
	"github.com/trading-platform/market-data-service/internal/cache"
	"github.com/trading-platform/market-data-service/internal/config"
	"github.com/trading-platform/market-data-service/internal/consumers"
	"github.com/trading-platform/market-data-service/internal/messaging"
	"github.com/trading-platform/market-data-service/internal/providers"
	"github.com/trading-platform/market-data-service/internal/services"
	"github.com/trading-platform/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Info("🚀 Starting Market Data Service (Go)")

	// Load configuration
	cfg := config.Load()

	// Initialize multi-layer cache
	cacheClient, err := cache.NewMultiLayerCache(cfg.RedisURL, cfg.RedisPassword, cfg.RedisDB, logger)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer cacheClient.Close()

	// Initialize RabbitMQ
	rabbitmq, err := messaging.NewRabbitMQClient(cfg.RabbitMQURL, logger)
	if err != nil {
		logger.Warn("Failed to connect to RabbitMQ", zap.Error(err))
	} else {
		defer rabbitmq.Close()
	}

	// Initialize Kafka producer
	kafkaProducer := messaging.NewKafkaProducer(cfg.KafkaBrokers, logger)
	defer kafkaProducer.Close()

	// Initialize Kafka consumer
	kafkaConsumer := messaging.NewKafkaConsumer(cfg.KafkaBrokers, cfg.KafkaConsumerGroup, logger)
	defer kafkaConsumer.Close()

	// Initialize data providers
	binanceProvider := providers.NewBinanceProvider(&providers.ProviderConfig{
		APIURL: cfg.BinanceAPIURL,
		WSURL:  cfg.BinanceWSURL,
	}, logger)
	defer binanceProvider.Close()

	coingeckoProvider := providers.NewCoinGeckoProvider(&providers.ProviderConfig{
		APIURL:    cfg.CoinGeckoAPIURL,
		APIKey:    cfg.CoinGeckoAPIKey,
		RateLimit: 10, // Free tier
	}, logger)
	defer coingeckoProvider.Close()

	// Initialize service config
	serviceConfig := &services.ServiceConfig{
		TickerWorkers:         cfg.TickerWorkers,
		OrderbookWorkers:      cfg.OrderbookWorkers,
		KlineWorkers:          cfg.KlineWorkers,
		TickerSyncInterval:    time.Duration(cfg.TickerSyncInterval) * time.Second,
		KlineSyncInterval:     time.Duration(cfg.KlineSyncInterval) * time.Second,
		MarketCapSyncInterval: time.Duration(cfg.MarketCapSyncInterval) * time.Second,
		CacheTTLTicker:        time.Duration(cfg.CacheTTLTicker) * time.Second,
		CacheTTLOrderbook:     time.Duration(cfg.CacheTTLOrderbook) * time.Second,
		CacheTTLKline:         time.Duration(cfg.CacheTTLKline) * time.Second,
		CacheTTLMarketCap:     time.Duration(cfg.CacheTTLMarketCap) * time.Second,
	}

	// Initialize market data service
	marketDataService := services.NewMarketDataService(
		binanceProvider,
		coingeckoProvider,
		cacheClient,
		kafkaProducer,
		rabbitmq,
		serviceConfig,
		logger,
	)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start market data service
	if err := marketDataService.Start(); err != nil {
		logger.Fatal("Failed to start market data service", zap.Error(err))
	}

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()

	// Initialize consumers
	if rabbitmq != nil {
		matchingConsumer := consumers.NewMatchingEngineConsumer(
			rabbitmq, kafkaConsumer, kafkaProducer, cacheClient, wsHub, logger,
		)
		if err := matchingConsumer.Start(ctx); err != nil {
			logger.Error("Failed to start matching engine consumer", zap.Error(err))
		}

		tradingConsumer := consumers.NewTradingConsumer(
			rabbitmq, kafkaConsumer, cacheClient, wsHub, logger,
		)
		if err := tradingConsumer.Start(ctx); err != nil {
			logger.Error("Failed to start trading consumer", zap.Error(err))
		}
	}

	// Start HTTP server
	httpServer := api.NewHTTPServer(marketDataService, logger)
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

	logger.Info("✅ Market Data Service started successfully",
		zap.String("http_port", cfg.HTTPPort),
		zap.String("websocket_port", cfg.WebSocketPort),
		zap.String("grpc_port", cfg.GRPCPort),
		zap.String("instance_id", cfg.InstanceID),
	)

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	logger.Info("Shutting down Market Data Service...")
	cancel()
	marketDataService.Stop()
	logger.Info("Market Data Service stopped")
}
