package providers

import (
	"context"

	"github.com/trading-platform/market-data-service/internal/types"
)

// DataProvider interface for market data providers
type DataProvider interface {
	// GetTicker returns ticker data for a trading pair
	GetTicker(ctx context.Context, pair string) (*types.Ticker, error)

	// GetTickers returns ticker data for multiple pairs
	GetTickers(ctx context.Context, pairs []string) ([]*types.Ticker, error)

	// GetOrderbook returns orderbook for a trading pair
	GetOrderbook(ctx context.Context, pair string, limit int) (*types.OrderBook, error)

	// GetKlines returns kline/candlestick data
	GetKlines(ctx context.Context, pair, interval string, limit int) ([]*types.Kline, error)

	// GetRecentTrades returns recent trades
	GetRecentTrades(ctx context.Context, pair string, limit int) ([]*types.Trade, error)

	// GetMarketInfo returns market information
	GetMarketInfo(ctx context.Context, symbol string) (*types.MarketInfo, error)

	// SubscribeTicker subscribes to real-time ticker updates
	SubscribeTicker(ctx context.Context, pairs []string, handler func(*types.Ticker)) error

	// SubscribeOrderbook subscribes to real-time orderbook updates
	SubscribeOrderbook(ctx context.Context, pair string, handler func(*types.OrderBook)) error

	// SubscribeTrades subscribes to real-time trade updates
	SubscribeTrades(ctx context.Context, pair string, handler func(*types.Trade)) error

	// GetName returns the provider name
	GetName() string

	// IsHealthy checks if the provider is healthy
	IsHealthy() bool

	// Close closes the provider connections
	Close() error
}

// ProviderConfig holds provider configuration
type ProviderConfig struct {
	APIURL    string
	APIKey    string
	WSURL     string
	RateLimit int // requests per minute
}
