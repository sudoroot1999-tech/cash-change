package ticker

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/shopspring/decimal"
	"github.com/exchange/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

// Ticker represents 24hr ticker data
type Ticker struct {
	Symbol             string `json:"symbol"`
	LastPrice          string `json:"lastPrice"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	High24h            string `json:"high24h"`
	Low24h             string `json:"low24h"`
	Volume24h          string `json:"volume24h"`
	QuoteVolume24h     string `json:"quoteVolume24h"`
	OpenPrice          string `json:"openPrice"`
	ClosePrice         string `json:"closePrice"`
	BidPrice           string `json:"bidPrice"`
	AskPrice           string `json:"askPrice"`
	Timestamp          int64  `json:"timestamp"`
}

// OrderBookLevel represents a price level
type OrderBookLevel struct {
	Price    string `json:"price"`
	Quantity string `json:"quantity"`
}

// OrderBook represents the order book
type OrderBook struct {
	Symbol    string           `json:"symbol"`
	Bids      []OrderBookLevel `json:"bids"`
	Asks      []OrderBookLevel `json:"asks"`
	Timestamp int64            `json:"timestamp"`
}

// Trade represents a recent trade
type Trade struct {
	ID        string `json:"id"`
	Symbol    string `json:"symbol"`
	Price     string `json:"price"`
	Quantity  string `json:"quantity"`
	Side      string `json:"side"`
	Timestamp int64  `json:"timestamp"`
}

// Kline represents a candlestick
type Kline struct {
	OpenTime    int64  `json:"openTime"`
	Open        string `json:"open"`
	High        string `json:"high"`
	Low         string `json:"low"`
	Close       string `json:"close"`
	Volume      string `json:"volume"`
	CloseTime   int64  `json:"closeTime"`
	QuoteVolume string `json:"quoteVolume"`
	Trades      int    `json:"trades"`
}

// TickerService manages market data
type TickerService struct {
	redis   *redis.Client
	logger  *zap.Logger
	tickers map[string]*Ticker
	mu      sync.RWMutex
	ctx     context.Context
}

// Default symbols
var defaultSymbols = []string{"BTC/USDT", "ETH/USDT", "ETH/BTC", "BNB/USDT", "USDC/USDT"}

// NewTickerService creates a new ticker service
func NewTickerService(redis *redis.Client, logger *zap.Logger) *TickerService {
	ts := &TickerService{
		redis:   redis,
		logger:  logger,
		tickers: make(map[string]*Ticker),
		ctx:     context.Background(),
	}

	// Initialize with mock data
	ts.initializeMockTickers()

	return ts
}

func (s *TickerService) initializeMockTickers() {
	basePrices := map[string]float64{
		"BTC/USDT":  45000.00,
		"ETH/USDT":  2500.00,
		"ETH/BTC":   0.055,
		"BNB/USDT":  320.00,
		"USDC/USDT": 1.00,
	}

	for _, symbol := range defaultSymbols {
		price := basePrices[symbol]
		s.tickers[symbol] = &Ticker{
			Symbol:             symbol,
			LastPrice:          fmt.Sprintf("%.8f", price),
			PriceChange:        "0",
			PriceChangePercent: "0",
			High24h:            fmt.Sprintf("%.8f", price*1.02),
			Low24h:             fmt.Sprintf("%.8f", price*0.98),
			Volume24h:          "1000000",
			QuoteVolume24h:     fmt.Sprintf("%.2f", price*1000000),
			OpenPrice:          fmt.Sprintf("%.8f", price),
			ClosePrice:         fmt.Sprintf("%.8f", price),
			BidPrice:           fmt.Sprintf("%.8f", price*0.999),
			AskPrice:           fmt.Sprintf("%.8f", price*1.001),
			Timestamp:          time.Now().UnixMilli(),
		}
	}
}

// StartUpdates starts periodic ticker updates
func (s *TickerService) StartUpdates(hub *websocket.Hub) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.updateTickers()
		s.broadcastToHub(hub)
	}
}

func (s *TickerService) updateTickers() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for symbol, t := range s.tickers {
		// Simulate small price changes
		lastPrice, _ := decimal.NewFromString(t.LastPrice)
		change := decimal.NewFromFloat((rand.Float64() - 0.5) * 0.001) // ±0.05%
		newPrice := lastPrice.Mul(decimal.NewFromFloat(1).Add(change))

		openPrice, _ := decimal.NewFromString(t.OpenPrice)
		priceChange := newPrice.Sub(openPrice)
		priceChangePercent := priceChange.Div(openPrice).Mul(decimal.NewFromInt(100))

		t.LastPrice = newPrice.StringFixed(8)
		t.ClosePrice = t.LastPrice
		t.PriceChange = priceChange.StringFixed(8)
		t.PriceChangePercent = priceChangePercent.StringFixed(2)
		t.BidPrice = newPrice.Mul(decimal.NewFromFloat(0.999)).StringFixed(8)
		t.AskPrice = newPrice.Mul(decimal.NewFromFloat(1.001)).StringFixed(8)
		t.Timestamp = time.Now().UnixMilli()

		// Update Redis cache
		data, _ := json.Marshal(t)
		s.redis.Set(s.ctx, fmt.Sprintf("ticker:%s", symbol), data, 5*time.Second)
	}
}

func (s *TickerService) broadcastToHub(hub *websocket.Hub) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for symbol, t := range s.tickers {
		data, _ := json.Marshal(map[string]interface{}{
			"event":   "ticker",
			"channel": fmt.Sprintf("ticker@%s", symbol),
			"data":    t,
		})
		hub.Broadcast(data)
	}
}

// GetTicker returns ticker for a symbol
func (s *TickerService) GetTicker(symbol string) *Ticker {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.tickers[symbol]
}

// GetAllTickers returns all tickers
func (s *TickerService) GetAllTickers() []*Ticker {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*Ticker, 0, len(s.tickers))
	for _, t := range s.tickers {
		result = append(result, t)
	}
	return result
}

// GetOrderBook returns mock order book for a symbol
func (s *TickerService) GetOrderBook(symbol string, depth int) *OrderBook {
	s.mu.RLock()
	t := s.tickers[symbol]
	s.mu.RUnlock()

	if t == nil {
		return nil
	}

	lastPrice, _ := decimal.NewFromString(t.LastPrice)
	bids := make([]OrderBookLevel, depth)
	asks := make([]OrderBookLevel, depth)

	for i := 0; i < depth; i++ {
		bidPrice := lastPrice.Mul(decimal.NewFromFloat(1 - float64(i+1)*0.0001))
		askPrice := lastPrice.Mul(decimal.NewFromFloat(1 + float64(i+1)*0.0001))
		qty := decimal.NewFromFloat(rand.Float64() * 10)

		bids[i] = OrderBookLevel{Price: bidPrice.StringFixed(8), Quantity: qty.StringFixed(8)}
		asks[i] = OrderBookLevel{Price: askPrice.StringFixed(8), Quantity: qty.StringFixed(8)}
	}

	return &OrderBook{
		Symbol:    symbol,
		Bids:      bids,
		Asks:      asks,
		Timestamp: time.Now().UnixMilli(),
	}
}

// GetRecentTrades returns mock recent trades
func (s *TickerService) GetRecentTrades(symbol string, limit int) []Trade {
	s.mu.RLock()
	t := s.tickers[symbol]
	s.mu.RUnlock()

	if t == nil {
		return nil
	}

	lastPrice, _ := decimal.NewFromString(t.LastPrice)
	trades := make([]Trade, limit)

	for i := 0; i < limit; i++ {
		price := lastPrice.Mul(decimal.NewFromFloat(1 + (rand.Float64()-0.5)*0.001))
		side := "buy"
		if rand.Intn(2) == 0 {
			side = "sell"
		}

		trades[i] = Trade{
			ID:        fmt.Sprintf("%d", time.Now().UnixNano()-int64(i)),
			Symbol:    symbol,
			Price:     price.StringFixed(8),
			Quantity:  decimal.NewFromFloat(rand.Float64() * 5).StringFixed(8),
			Side:      side,
			Timestamp: time.Now().UnixMilli() - int64(i*1000),
		}
	}

	return trades
}

// GetKlines returns mock klines
func (s *TickerService) GetKlines(symbol, interval string, limit int) []Kline {
	s.mu.RLock()
	t := s.tickers[symbol]
	s.mu.RUnlock()

	if t == nil {
		return nil
	}

	lastPrice, _ := decimal.NewFromString(t.LastPrice)
	klines := make([]Kline, limit)

	var intervalMs int64 = 60000 // 1m default
	switch interval {
	case "1h":
		intervalMs = 3600000
	case "4h":
		intervalMs = 14400000
	case "1d":
		intervalMs = 86400000
	}

	now := time.Now().UnixMilli()
	for i := limit - 1; i >= 0; i-- {
		openTime := now - int64(i)*intervalMs
		closeTime := openTime + intervalMs - 1

		basePrice := lastPrice.Mul(decimal.NewFromFloat(1 + (rand.Float64()-0.5)*0.02))
		open := basePrice.Mul(decimal.NewFromFloat(1 + (rand.Float64()-0.5)*0.005))
		close := basePrice.Mul(decimal.NewFromFloat(1 + (rand.Float64()-0.5)*0.005))
		high := decimal.Max(open, close).Mul(decimal.NewFromFloat(1 + rand.Float64()*0.002))
		low := decimal.Min(open, close).Mul(decimal.NewFromFloat(1 - rand.Float64()*0.002))
		volume := decimal.NewFromFloat(rand.Float64() * 1000)

		klines[limit-1-i] = Kline{
			OpenTime:    openTime,
			Open:        open.StringFixed(8),
			High:        high.StringFixed(8),
			Low:         low.StringFixed(8),
			Close:       close.StringFixed(8),
			Volume:      volume.StringFixed(8),
			CloseTime:   closeTime,
			QuoteVolume: volume.Mul(basePrice).StringFixed(2),
			Trades:      rand.Intn(1000) + 100,
		}
	}

	return klines
}
