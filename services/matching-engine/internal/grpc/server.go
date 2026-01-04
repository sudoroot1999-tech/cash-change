package grpc

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/trading-platform/matching-engine/internal/engine"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Server is the gRPC server for matching engine
type Server struct {
	engine     *engine.MatchingEngine
	grpcServer *grpc.Server
	logger     *zap.Logger
	startTime  time.Time
}

// NewServer creates a new gRPC server
func NewServer(engine *engine.MatchingEngine, logger *zap.Logger) *Server {
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(10*1024*1024),
		grpc.MaxSendMsgSize(10*1024*1024),
	)

	server := &Server{
		engine:     engine,
		grpcServer: grpcServer,
		logger:     logger,
		startTime:  time.Now(),
	}

	// Register the service
	RegisterMatchingServiceServer(grpcServer, server)

	// Enable reflection for debugging
	reflection.Register(grpcServer)

	return server
}

// Start starts the gRPC server
func (s *Server) Start(port string) error {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	s.logger.Info("✅ gRPC server starting", zap.String("port", port))
	return s.grpcServer.Serve(lis)
}

// Stop stops the gRPC server gracefully
func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

// HealthCheck returns the health status of the matching engine
func (s *Server) HealthCheck(ctx context.Context, req *HealthCheckRequest) (*HealthCheckResponse, error) {
	return &HealthCheckResponse{
		Status:    "healthy",
		Service:   "matching-engine",
		Version:   "1.0.0",
		Timestamp: time.Now().Unix(),
	}, nil
}

// GetMetrics returns engine metrics
func (s *Server) GetMetrics(ctx context.Context, req *GetMetricsRequest) (*GetMetricsResponse, error) {
	uptime := time.Since(s.startTime)

	// TODO: Get actual metrics from engine
	return &GetMetricsResponse{
		TotalOrders:        0,
		TotalMatches:       0,
		ActiveOrderBooks:   0,
		Uptime:             uptime.String(),
		MatchRatePerSecond: 0.0,
		OrdersPerSecond:    0,
		AverageLatencyMs:   0.0,
	}, nil
}

// GetOrderBook returns the order book for a trading pair
func (s *Server) GetOrderBook(ctx context.Context, req *GetOrderBookRequest) (*GetOrderBookResponse, error) {
	depth := int(req.Depth)
	if depth <= 0 {
		depth = 20 // default depth
	}

	ob := s.engine.GetOrderBook(req.Symbol, depth)
	if ob == nil {
		return &GetOrderBookResponse{
			Symbol:       req.Symbol,
			Bids:         []*PriceLevel{},
			Asks:         []*PriceLevel{},
			LastUpdateId: 0,
			Timestamp:    time.Now().Unix(),
		}, nil
	}

	bids := make([]*PriceLevel, len(ob.Bids))
	for i, bid := range ob.Bids {
		bids[i] = &PriceLevel{
			Price:    bid.Price.String(),
			Quantity: bid.Quantity.String(),
		}
	}

	asks := make([]*PriceLevel, len(ob.Asks))
	for i, ask := range ob.Asks {
		asks[i] = &PriceLevel{
			Price:    ask.Price.String(),
			Quantity: ask.Quantity.String(),
		}
	}

	return &GetOrderBookResponse{
		Symbol:       req.Symbol,
		Bids:         bids,
		Asks:         asks,
		LastUpdateId: time.Now().UnixNano() / 1000000, // Use timestamp as update ID
		Timestamp:    time.Now().Unix(),
	}, nil
}

// mustEmbedUnimplementedMatchingServiceServer implements the interface
func (s *Server) mustEmbedUnimplementedMatchingServiceServer() {}
