package grpc

import (
	"context"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

// ServiceClients holds all gRPC client connections
// NOTE: Matching Engine gRPC is ONLY for read-only operations (stats, health, config, ping)
// Market data updates (trades, orderbook) are received via async messaging (RabbitMQ/Kafka)
type ServiceClients struct {
	// MatchingEngine - READ-ONLY: stats, health, config, ping only
	// DO NOT use for order operations - market data comes via async events
	MatchingEngine *grpc.ClientConn
	Trading        *grpc.ClientConn
	logger         *zap.Logger
}

// ClientConfig holds gRPC client configuration
type ClientConfig struct {
	MatchingEngineAddr string // READ-ONLY: stats, health, config, ping
	TradingAddr        string
}

// NewServiceClients creates new gRPC service clients
func NewServiceClients(cfg *ClientConfig, logger *zap.Logger) (*ServiceClients, error) {
	clients := &ServiceClients{logger: logger}

	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             3 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(10*1024*1024),
			grpc.MaxCallSendMsgSize(10*1024*1024),
		),
	}

	var err error

	// Connect to Matching Engine (READ-ONLY: stats, health, config, ping)
	// DO NOT use for order operations - market data comes via async events
	if cfg.MatchingEngineAddr != "" {
		clients.MatchingEngine, err = grpc.Dial(cfg.MatchingEngineAddr, opts...)
		if err != nil {
			logger.Warn("Failed to connect to Matching Engine gRPC", zap.Error(err))
		} else {
			logger.Info("✅ Connected to Matching Engine gRPC (read-only: stats/health/config)",
				zap.String("addr", cfg.MatchingEngineAddr))
		}
	}

	// Connect to Trading Service
	if cfg.TradingAddr != "" {
		clients.Trading, err = grpc.Dial(cfg.TradingAddr, opts...)
		if err != nil {
			logger.Warn("Failed to connect to Trading gRPC", zap.Error(err))
		} else {
			logger.Info("✅ Connected to Trading gRPC", zap.String("addr", cfg.TradingAddr))
		}
	}

	logger.Info("📨 Market data updates received via async messaging (RabbitMQ/Kafka)")

	return clients, nil
}

// Close closes all gRPC connections
func (c *ServiceClients) Close() {
	if c.MatchingEngine != nil {
		c.MatchingEngine.Close()
	}
	if c.Trading != nil {
		c.Trading.Close()
	}
}

// HealthCheck checks all gRPC connections
func (c *ServiceClients) HealthCheck(ctx context.Context) map[string]bool {
	return map[string]bool{
		"matching_engine": c.MatchingEngine != nil && c.MatchingEngine.GetState().String() == "READY",
		"trading":         c.Trading != nil && c.Trading.GetState().String() == "READY",
	}
}
