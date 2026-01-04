package grpc

// This file contains placeholder types for gRPC
// In production, these would be generated from proto files using:
// protoc --go_out=. --go-grpc_out=. proto/market_data.proto

import (
	"context"

	"google.golang.org/grpc"
)

// Request types
type GetTickerRequest struct {
	TradingPair string
}

type GetTickersRequest struct {
	TradingPairs []string
}

type GetOrderbookRequest struct {
	TradingPair string
	Limit       int32
}

type GetKlinesRequest struct {
	TradingPair string
	Interval    string
	Limit       int32
}

type GetRecentTradesRequest struct {
	TradingPair string
	Limit       int32
}

type GetMarketInfoRequest struct {
	Symbol string
}

type StreamTickerRequest struct {
	TradingPairs []string
}

type StreamOrderbookRequest struct {
	TradingPair string
}

type HealthCheckRequest struct{}

// Response types
type TickerResponse struct {
	Symbol         string
	TradingPair    string
	Price          string
	PriceChange    string
	PriceChangePct string
	High_24H       string
	Low_24H        string
	Volume_24H     string
	QuoteVolume    string
	BidPrice       string
	AskPrice       string
	Source         string
	Timestamp      int64
}

type TickersResponse struct {
	Tickers []*TickerResponse
}

type PriceLevel struct {
	Price    string
	Quantity string
}

type OrderbookResponse struct {
	TradingPair  string
	Bids         []*PriceLevel
	Asks         []*PriceLevel
	LastUpdateId int64
	Source       string
	Timestamp    int64
}

type Kline struct {
	TradingPair string
	Interval    string
	OpenTime    int64
	CloseTime   int64
	Open        string
	High        string
	Low         string
	Close       string
	Volume      string
	QuoteVolume string
	TradeCount  int64
	Source      string
}

type KlinesResponse struct {
	Klines []*Kline
}

type Trade struct {
	Id          string
	TradingPair string
	Price       string
	Quantity    string
	Side        string
	Timestamp   int64
	Source      string
}

type TradesResponse struct {
	Trades []*Trade
}

type MarketInfoResponse struct {
	Symbol            string
	Name              string
	AssetType         string
	MarketCap         string
	MarketCapRank     int32
	CirculatingSupply string
	TotalSupply       string
	MaxSupply         string
	Ath               string
	AthDate           int64
	Atl               string
	AtlDate           int64
	LastUpdated       int64
}

type HealthCheckResponse struct {
	Healthy bool
	Details map[string]string
}

// Service interface
type MarketDataServiceServer interface {
	GetTicker(context.Context, *GetTickerRequest) (*TickerResponse, error)
	GetTickers(context.Context, *GetTickersRequest) (*TickersResponse, error)
	GetOrderbook(context.Context, *GetOrderbookRequest) (*OrderbookResponse, error)
	GetKlines(context.Context, *GetKlinesRequest) (*KlinesResponse, error)
	GetRecentTrades(context.Context, *GetRecentTradesRequest) (*TradesResponse, error)
	GetMarketInfo(context.Context, *GetMarketInfoRequest) (*MarketInfoResponse, error)
	StreamTicker(*StreamTickerRequest, MarketDataService_StreamTickerServer) error
	StreamOrderbook(*StreamOrderbookRequest, MarketDataService_StreamOrderbookServer) error
	HealthCheck(context.Context, *HealthCheckRequest) (*HealthCheckResponse, error)
	mustEmbedUnimplementedMarketDataServiceServer()
}

// Stream interfaces
type MarketDataService_StreamTickerServer interface {
	Send(*TickerResponse) error
	grpc.ServerStream
}

type MarketDataService_StreamOrderbookServer interface {
	Send(*OrderbookResponse) error
	grpc.ServerStream
}

// RegisterMarketDataServiceServer registers the service
func RegisterMarketDataServiceServer(s *grpc.Server, srv MarketDataServiceServer) {
	// In production, this would be generated code
	// For now, we'll use reflection-based registration
}
