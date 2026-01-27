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
// All order flow and trading operations MUST use async messaging (RabbitMQ/Kafka)
type ServiceClients struct {
	// MatchingEngine - READ-ONLY: stats, health, config, ping only
	// DO NOT use for order submission, cancellation, or any write operations
	MatchingEngine *grpc.ClientConn
	MarketData     *grpc.ClientConn
	Wallet         *grpc.ClientConn
	SocialTrading  *grpc.ClientConn
	logger         *zap.Logger
}

// ClientConfig holds gRPC client configuration
type ClientConfig struct {
	MatchingEngineAddr string // READ-ONLY: stats, health, config, ping
	MarketDataAddr     string
	WalletAddr         string
	SocialTradingAddr  string
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
	// DO NOT use for order operations - those must go via RabbitMQ/Kafka
	clients.MatchingEngine, err = grpc.Dial(cfg.MatchingEngineAddr, opts...)
	if err != nil {
		logger.Warn("Failed to connect to Matching Engine gRPC", zap.Error(err))
	} else {
		logger.Info("✅ Connected to Matching Engine gRPC (read-only: stats/health/config)",
			zap.String("addr", cfg.MatchingEngineAddr))
	}

	// Connect to Market Data
	clients.MarketData, err = grpc.Dial(cfg.MarketDataAddr, opts...)
	if err != nil {
		logger.Warn("Failed to connect to Market Data gRPC", zap.Error(err))
	} else {
		logger.Info("✅ Connected to Market Data gRPC", zap.String("addr", cfg.MarketDataAddr))
	}

	// Connect to Wallet
	clients.Wallet, err = grpc.Dial(cfg.WalletAddr, opts...)
	if err != nil {
		logger.Warn("Failed to connect to Wallet gRPC", zap.Error(err))
	} else {
		logger.Info("✅ Connected to Wallet gRPC", zap.String("addr", cfg.WalletAddr))
	}

	// Connect to Social Trading
	clients.SocialTrading, err = grpc.Dial(cfg.SocialTradingAddr, opts...)
	if err != nil {
		logger.Warn("Failed to connect to Social Trading gRPC", zap.Error(err))
	} else {
		logger.Info("✅ Connected to Social Trading gRPC", zap.String("addr", cfg.SocialTradingAddr))
	}

	logger.Info("📨 Order flow uses async messaging (RabbitMQ/Kafka) - gRPC to matching engine is read-only")

	return clients, nil
}

// Close closes all gRPC connections
func (c *ServiceClients) Close() {
	if c.MatchingEngine != nil {
		c.MatchingEngine.Close()
	}
	if c.MarketData != nil {
		c.MarketData.Close()
	}
	if c.Wallet != nil {
		c.Wallet.Close()
	}
	if c.SocialTrading != nil {
		c.SocialTrading.Close()
	}
}

// HealthCheck checks all gRPC connections
func (c *ServiceClients) HealthCheck(ctx context.Context) map[string]bool {
	return map[string]bool{
		"matching_engine": c.MatchingEngine != nil && c.MatchingEngine.GetState().String() == "READY",
		"market_data":     c.MarketData != nil && c.MarketData.GetState().String() == "READY",
		"wallet":          c.Wallet != nil && c.Wallet.GetState().String() == "READY",
		"social_trading":  c.SocialTrading != nil && c.SocialTrading.GetState().String() == "READY",
	}
}
