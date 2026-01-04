package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"
	"github.com/trading-platform/market-data-service/internal/types"
	"go.uber.org/zap"
)

// BinanceProvider implements DataProvider for Binance
type BinanceProvider struct {
	config     *ProviderConfig
	httpClient *http.Client
	wsConns    map[string]*websocket.Conn
	logger     *zap.Logger
	mu         sync.RWMutex
	healthy    bool
}

// NewBinanceProvider creates a new Binance provider
func NewBinanceProvider(config *ProviderConfig, logger *zap.Logger) *BinanceProvider {
	return &BinanceProvider{
		config: config,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		wsConns: make(map[string]*websocket.Conn),
		logger:  logger,
		healthy: true,
	}
}

func (p *BinanceProvider) GetName() string {
	return "BINANCE"
}

func (p *BinanceProvider) IsHealthy() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.healthy
}

// Binance API response structures
type binanceTicker struct {
	Symbol             string `json:"symbol"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	LastPrice          string `json:"lastPrice"`
	BidPrice           string `json:"bidPrice"`
	AskPrice           string `json:"askPrice"`
	OpenPrice          string `json:"openPrice"`
	HighPrice          string `json:"highPrice"`
	LowPrice           string `json:"lowPrice"`
	Volume             string `json:"volume"`
	QuoteVolume        string `json:"quoteVolume"`
}

type binanceOrderbook struct {
	LastUpdateID int64      `json:"lastUpdateId"`
	Bids         [][]string `json:"bids"`
	Asks         [][]string `json:"asks"`
}

type binanceKline struct {
	OpenTime    int64
	Open        string
	High        string
	Low         string
	Close       string
	Volume      string
	CloseTime   int64
	QuoteVolume string
	TradeCount  int64
}


// GetTicker returns ticker data for a trading pair
func (p *BinanceProvider) GetTicker(ctx context.Context, pair string) (*types.Ticker, error) {
	url := fmt.Sprintf("%s/api/v3/ticker/24hr?symbol=%s", p.config.APIURL, pair)

	resp, err := p.httpClient.Get(url)
	if err != nil {
		p.setHealthy(false)
		return nil, fmt.Errorf("failed to get ticker: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("binance API error: %s", string(body))
	}

	var bt binanceTicker
	if err := json.NewDecoder(resp.Body).Decode(&bt); err != nil {
		return nil, fmt.Errorf("failed to decode ticker: %w", err)
	}

	p.setHealthy(true)
	return p.convertTicker(&bt), nil
}

// GetTickers returns ticker data for multiple pairs
func (p *BinanceProvider) GetTickers(ctx context.Context, pairs []string) ([]*types.Ticker, error) {
	url := fmt.Sprintf("%s/api/v3/ticker/24hr", p.config.APIURL)

	resp, err := p.httpClient.Get(url)
	if err != nil {
		p.setHealthy(false)
		return nil, fmt.Errorf("failed to get tickers: %w", err)
	}
	defer resp.Body.Close()

	var tickers []binanceTicker
	if err := json.NewDecoder(resp.Body).Decode(&tickers); err != nil {
		return nil, fmt.Errorf("failed to decode tickers: %w", err)
	}

	// Filter by requested pairs
	pairSet := make(map[string]bool)
	for _, p := range pairs {
		pairSet[p] = true
	}

	var result []*types.Ticker
	for _, bt := range tickers {
		if len(pairs) == 0 || pairSet[bt.Symbol] {
			result = append(result, p.convertTicker(&bt))
		}
	}

	p.setHealthy(true)
	return result, nil
}

func (p *BinanceProvider) convertTicker(bt *binanceTicker) *types.Ticker {
	return &types.Ticker{
		Symbol:         bt.Symbol,
		TradingPair:    bt.Symbol,
		Price:          parseDecimal(bt.LastPrice),
		PriceChange:    parseDecimal(bt.PriceChange),
		PriceChangePct: parseDecimal(bt.PriceChangePercent),
		High24h:        parseDecimal(bt.HighPrice),
		Low24h:         parseDecimal(bt.LowPrice),
		Volume24h:      parseDecimal(bt.Volume),
		QuoteVolume:    parseDecimal(bt.QuoteVolume),
		OpenPrice:      parseDecimal(bt.OpenPrice),
		LastPrice:      parseDecimal(bt.LastPrice),
		BidPrice:       parseDecimal(bt.BidPrice),
		AskPrice:       parseDecimal(bt.AskPrice),
		Source:         types.DataSourceBinance,
		Timestamp:      time.Now(),
	}
}

func parseDecimal(s string) decimal.Decimal {
	d, _ := decimal.NewFromString(s)
	return d
}

func (p *BinanceProvider) setHealthy(healthy bool) {
	p.mu.Lock()
	p.healthy = healthy
	p.mu.Unlock()
}


// GetOrderbook returns orderbook for a trading pair
func (p *BinanceProvider) GetOrderbook(ctx context.Context, pair string, limit int) (*types.OrderBook, error) {
	if limit == 0 {
		limit = 100
	}
	url := fmt.Sprintf("%s/api/v3/depth?symbol=%s&limit=%d", p.config.APIURL, pair, limit)

	resp, err := p.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get orderbook: %w", err)
	}
	defer resp.Body.Close()

	var ob binanceOrderbook
	if err := json.NewDecoder(resp.Body).Decode(&ob); err != nil {
		return nil, fmt.Errorf("failed to decode orderbook: %w", err)
	}

	return &types.OrderBook{
		TradingPair:  pair,
		Bids:         convertPriceLevels(ob.Bids),
		Asks:         convertPriceLevels(ob.Asks),
		LastUpdateID: ob.LastUpdateID,
		Source:       types.DataSourceBinance,
		Timestamp:    time.Now(),
	}, nil
}

func convertPriceLevels(levels [][]string) []types.PriceLevel {
	result := make([]types.PriceLevel, len(levels))
	for i, level := range levels {
		if len(level) >= 2 {
			result[i] = types.PriceLevel{
				Price:    parseDecimal(level[0]),
				Quantity: parseDecimal(level[1]),
			}
		}
	}
	return result
}

// GetKlines returns kline/candlestick data
func (p *BinanceProvider) GetKlines(ctx context.Context, pair, interval string, limit int) ([]*types.Kline, error) {
	if limit == 0 {
		limit = 500
	}
	url := fmt.Sprintf("%s/api/v3/klines?symbol=%s&interval=%s&limit=%d", p.config.APIURL, pair, interval, limit)

	resp, err := p.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get klines: %w", err)
	}
	defer resp.Body.Close()

	var rawKlines [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rawKlines); err != nil {
		return nil, fmt.Errorf("failed to decode klines: %w", err)
	}

	klines := make([]*types.Kline, len(rawKlines))
	for i, raw := range rawKlines {
		if len(raw) >= 11 {
			klines[i] = &types.Kline{
				TradingPair: pair,
				Interval:    interval,
				OpenTime:    time.UnixMilli(int64(raw[0].(float64))),
				CloseTime:   time.UnixMilli(int64(raw[6].(float64))),
				Open:        parseDecimal(raw[1].(string)),
				High:        parseDecimal(raw[2].(string)),
				Low:         parseDecimal(raw[3].(string)),
				Close:       parseDecimal(raw[4].(string)),
				Volume:      parseDecimal(raw[5].(string)),
				QuoteVolume: parseDecimal(raw[7].(string)),
				TradeCount:  int64(raw[8].(float64)),
				Source:      types.DataSourceBinance,
			}
		}
	}

	return klines, nil
}

// GetRecentTrades returns recent trades
func (p *BinanceProvider) GetRecentTrades(ctx context.Context, pair string, limit int) ([]*types.Trade, error) {
	if limit == 0 {
		limit = 500
	}
	url := fmt.Sprintf("%s/api/v3/trades?symbol=%s&limit=%d", p.config.APIURL, pair, limit)

	resp, err := p.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get trades: %w", err)
	}
	defer resp.Body.Close()

	var rawTrades []struct {
		ID           int64  `json:"id"`
		Price        string `json:"price"`
		Qty          string `json:"qty"`
		Time         int64  `json:"time"`
		IsBuyerMaker bool   `json:"isBuyerMaker"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rawTrades); err != nil {
		return nil, fmt.Errorf("failed to decode trades: %w", err)
	}

	trades := make([]*types.Trade, len(rawTrades))
	for i, raw := range rawTrades {
		side := "BUY"
		if raw.IsBuyerMaker {
			side = "SELL"
		}
		trades[i] = &types.Trade{
			ID:          fmt.Sprintf("%d", raw.ID),
			TradingPair: pair,
			Price:       parseDecimal(raw.Price),
			Quantity:    parseDecimal(raw.Qty),
			Side:        side,
			Timestamp:   time.UnixMilli(raw.Time),
			Source:      types.DataSourceBinance,
		}
	}

	return trades, nil
}


// GetMarketInfo returns market information (not available from Binance directly)
func (p *BinanceProvider) GetMarketInfo(ctx context.Context, symbol string) (*types.MarketInfo, error) {
	return nil, fmt.Errorf("market info not available from Binance, use CoinGecko")
}

// SubscribeTicker subscribes to real-time ticker updates via WebSocket
func (p *BinanceProvider) SubscribeTicker(ctx context.Context, pairs []string, handler func(*types.Ticker)) error {
	streams := make([]string, len(pairs))
	for i, pair := range pairs {
		streams[i] = strings.ToLower(pair) + "@ticker"
	}

	wsURL := fmt.Sprintf("%s/%s", p.config.WSURL, strings.Join(streams, "/"))

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	p.mu.Lock()
	p.wsConns["ticker"] = conn
	p.mu.Unlock()

	go func() {
		defer conn.Close()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, message, err := conn.ReadMessage()
				if err != nil {
					p.logger.Error("WebSocket read error", zap.Error(err))
					return
				}

				var data struct {
					Stream string `json:"stream"`
					Data   struct {
						Symbol    string `json:"s"`
						LastPrice string `json:"c"`
						Open      string `json:"o"`
						High      string `json:"h"`
						Low       string `json:"l"`
						Volume    string `json:"v"`
						Change    string `json:"p"`
						ChangePct string `json:"P"`
						BidPrice  string `json:"b"`
						AskPrice  string `json:"a"`
					} `json:"data"`
				}

				if err := json.Unmarshal(message, &data); err != nil {
					continue
				}

				ticker := &types.Ticker{
					Symbol:         data.Data.Symbol,
					TradingPair:    data.Data.Symbol,
					Price:          parseDecimal(data.Data.LastPrice),
					LastPrice:      parseDecimal(data.Data.LastPrice),
					OpenPrice:      parseDecimal(data.Data.Open),
					High24h:        parseDecimal(data.Data.High),
					Low24h:         parseDecimal(data.Data.Low),
					Volume24h:      parseDecimal(data.Data.Volume),
					PriceChange:    parseDecimal(data.Data.Change),
					PriceChangePct: parseDecimal(data.Data.ChangePct),
					BidPrice:       parseDecimal(data.Data.BidPrice),
					AskPrice:       parseDecimal(data.Data.AskPrice),
					Source:         types.DataSourceBinance,
					Timestamp:      time.Now(),
				}

				handler(ticker)
			}
		}
	}()

	return nil
}

// SubscribeOrderbook subscribes to real-time orderbook updates
func (p *BinanceProvider) SubscribeOrderbook(ctx context.Context, pair string, handler func(*types.OrderBook)) error {
	wsURL := fmt.Sprintf("%s/%s@depth@100ms", p.config.WSURL, strings.ToLower(pair))

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	p.mu.Lock()
	p.wsConns["orderbook_"+pair] = conn
	p.mu.Unlock()

	go func() {
		defer conn.Close()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, message, err := conn.ReadMessage()
				if err != nil {
					p.logger.Error("WebSocket read error", zap.Error(err))
					return
				}

				var data struct {
					LastUpdateID int64      `json:"u"`
					Bids         [][]string `json:"b"`
					Asks         [][]string `json:"a"`
				}

				if err := json.Unmarshal(message, &data); err != nil {
					continue
				}

				orderbook := &types.OrderBook{
					TradingPair:  pair,
					Bids:         convertPriceLevels(data.Bids),
					Asks:         convertPriceLevels(data.Asks),
					LastUpdateID: data.LastUpdateID,
					Source:       types.DataSourceBinance,
					Timestamp:    time.Now(),
				}

				handler(orderbook)
			}
		}
	}()

	return nil
}

// SubscribeTrades subscribes to real-time trade updates
func (p *BinanceProvider) SubscribeTrades(ctx context.Context, pair string, handler func(*types.Trade)) error {
	wsURL := fmt.Sprintf("%s/%s@trade", p.config.WSURL, strings.ToLower(pair))

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	p.mu.Lock()
	p.wsConns["trades_"+pair] = conn
	p.mu.Unlock()

	go func() {
		defer conn.Close()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, message, err := conn.ReadMessage()
				if err != nil {
					return
				}

				var data struct {
					TradeID int64  `json:"t"`
					Price   string `json:"p"`
					Qty     string `json:"q"`
					Time    int64  `json:"T"`
					IsMaker bool   `json:"m"`
				}

				if err := json.Unmarshal(message, &data); err != nil {
					continue
				}

				side := "BUY"
				if data.IsMaker {
					side = "SELL"
				}

				trade := &types.Trade{
					ID:          fmt.Sprintf("%d", data.TradeID),
					TradingPair: pair,
					Price:       parseDecimal(data.Price),
					Quantity:    parseDecimal(data.Qty),
					Side:        side,
					Timestamp:   time.UnixMilli(data.Time),
					Source:      types.DataSourceBinance,
				}

				handler(trade)
			}
		}
	}()

	return nil
}

// Close closes all WebSocket connections
func (p *BinanceProvider) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	for name, conn := range p.wsConns {
		if err := conn.Close(); err != nil {
			p.logger.Error("Failed to close WebSocket", zap.String("name", name), zap.Error(err))
		}
	}
	p.wsConns = make(map[string]*websocket.Conn)
	return nil
}
