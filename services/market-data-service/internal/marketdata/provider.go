package marketdata

import (
	"context"
)

// TickerData represents a generic market data structure
type TickerData struct {
	Symbol             string
	LastPrice          float64
	PriceChange        float64
	PriceChangePercent float64
	High24h            float64
	Low24h             float64
	Volume24h          float64
	QuoteVolume24h     float64
}

// Currency represents a cryptocurrency asset
type Currency struct {
	ID     string `json:"id"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
}

// Provider defines the interface for fetching market data
type Provider interface {
	GetTickers(ctx context.Context, symbols []string) ([]*TickerData, error)
	GetCurrencies(ctx context.Context) ([]*Currency, error)
}
