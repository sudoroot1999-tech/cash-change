package grpc

// This file contains placeholder types for gRPC
// In production, these would be generated from proto files using:
// protoc --go_out=. --go-grpc_out=. proto/matching.proto

import (
	"context"

	"google.golang.org/grpc"
)

// Request types
type HealthCheckRequest struct{}

type GetMetricsRequest struct{}

type GetOrderBookRequest struct {
	Symbol string
	Depth  int32
}

// Response types
type HealthCheckResponse struct {
	Status    string
	Service   string
	Version   string
	Timestamp int64
}

type GetMetricsResponse struct {
	TotalOrders        int64
	TotalMatches       int64
	ActiveOrderBooks   int32
	Uptime             string
	MatchRatePerSecond float64
	OrdersPerSecond    int64
	AverageLatencyMs   float64
}

type PriceLevel struct {
	Price    string
	Quantity string
}

type GetOrderBookResponse struct {
	Symbol       string
	Bids         []*PriceLevel
	Asks         []*PriceLevel
	LastUpdateId int64
	Timestamp    int64
}

// MatchingServiceServer is the server API for MatchingService
type MatchingServiceServer interface {
	HealthCheck(context.Context, *HealthCheckRequest) (*HealthCheckResponse, error)
	GetMetrics(context.Context, *GetMetricsRequest) (*GetMetricsResponse, error)
	GetOrderBook(context.Context, *GetOrderBookRequest) (*GetOrderBookResponse, error)
	mustEmbedUnimplementedMatchingServiceServer()
}

// RegisterMatchingServiceServer registers the server
func RegisterMatchingServiceServer(s *grpc.Server, srv MatchingServiceServer) {
	// In production, this would be generated code
	// For now, we'll use reflection-based registration
}
