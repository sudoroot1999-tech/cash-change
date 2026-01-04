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

	"github.com/shopspring/decimal"
	"github.com/trading-platform/market-data-service/internal/types"
	"go.uber.org/zap"
)

// CoinGeckoProvider implements DataProvider for CoinGecko
type CoinGeckoProvider struct {
	config     *ProviderConfig
	httpClient *http.Client
	logger     *zap.Logger
	mu         sync.RWMutex
	healthy    bool
	// Rate limiting
	lastRequest time.Time
	minInterval time.Duration
}

// NewCoinGeckoProvider creates a new CoinGecko provider
func NewCoinGeckoProvider(config *ProviderConfig, logger *zap.Logger) *CoinGeckoProvider {
	rateLimit := config.RateLimit
	if rateLimit == 0 {
		rateLimit = 10 // Free tier: ~10-30 calls/minute
	}

	return &CoinGeckoProvider{
		config: config,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		logger:      logger,
		healthy:     true,
		minInterval: time.Minute / time.Duration(rateLimit),
	}
}

func (p *CoinGeckoProvider) GetName() string {
	return "COINGECKO"
}

func (p *CoinGeckoProvider) IsHealthy() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.healthy
}

func (p *CoinGeckoProvider) setHealthy(healthy bool) {
	p.mu.Lock()
	p.healthy = healthy
	p.mu.Unlock()
}

func (p *CoinGeckoProvider) rateLimit() {
	p.mu.Lock()
	defer p.mu.Unlock()

	elapsed := time.Since(p.lastRequest)
	if elapsed < p.minInterval {
		time.Sleep(p.minInterval - elapsed)
	}
	p.lastRequest = time.Now()
}

func (p *CoinGeckoProvider) doRequest(url string) ([]byte, error) {
	p.rateLimit()

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	if p.config.APIKey != "" {
		req.Header.Set("x-cg-demo-api-key", p.config.APIKey)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		p.setHealthy(false)
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		p.setHealthy(false)
		return nil, fmt.Errorf("rate limited")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	p.setHealthy(true)
	return io.ReadAll(resp.Body)
}


// CoinGecko API response structures
type coinGeckoMarket struct {
	ID                           string  `json:"id"`
	Symbol                       string  `json:"symbol"`
	Name                         string  `json:"name"`
	CurrentPrice                 float64 `json:"current_price"`
	MarketCap                    float64 `json:"market_cap"`
	MarketCapRank                int     `json:"market_cap_rank"`
	TotalVolume                  float64 `json:"total_volume"`
	High24h                      float64 `json:"high_24h"`
	Low24h                       float64 `json:"low_24h"`
	PriceChange24h               float64 `json:"price_change_24h"`
	PriceChangePercentage24h     float64 `json:"price_change_percentage_24h"`
	CirculatingSupply            float64 `json:"circulating_supply"`
	TotalSupply                  float64 `json:"total_supply"`
	MaxSupply                    float64 `json:"max_supply"`
	ATH                          float64 `json:"ath"`
	ATHDate                      string  `json:"ath_date"`
	ATL                          float64 `json:"atl"`
	ATLDate                      string  `json:"atl_date"`
	LastUpdated                  string  `json:"last_updated"`
}

// GetTicker returns ticker data for a trading pair
func (p *CoinGeckoProvider) GetTicker(ctx context.Context, pair string) (*types.Ticker, error) {
	// CoinGecko uses coin IDs, not trading pairs
	// Convert pair like "BTCUSDT" to coin ID "bitcoin"
	coinID := p.pairToCoinID(pair)

	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&ids=%s", p.config.APIURL, coinID)

	body, err := p.doRequest(url)
	if err != nil {
		return nil, err
	}

	var markets []coinGeckoMarket
	if err := json.Unmarshal(body, &markets); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(markets) == 0 {
		return nil, fmt.Errorf("no data found for %s", pair)
	}

	m := markets[0]
	return &types.Ticker{
		Symbol:         strings.ToUpper(m.Symbol),
		TradingPair:    pair,
		Price:          decimal.NewFromFloat(m.CurrentPrice),
		PriceChange:    decimal.NewFromFloat(m.PriceChange24h),
		PriceChangePct: decimal.NewFromFloat(m.PriceChangePercentage24h),
		High24h:        decimal.NewFromFloat(m.High24h),
		Low24h:         decimal.NewFromFloat(m.Low24h),
		Volume24h:      decimal.NewFromFloat(m.TotalVolume),
		LastPrice:      decimal.NewFromFloat(m.CurrentPrice),
		Source:         types.DataSourceCoinGecko,
		Timestamp:      time.Now(),
	}, nil
}

// GetTickers returns ticker data for multiple pairs
func (p *CoinGeckoProvider) GetTickers(ctx context.Context, pairs []string) ([]*types.Ticker, error) {
	coinIDs := make([]string, len(pairs))
	for i, pair := range pairs {
		coinIDs[i] = p.pairToCoinID(pair)
	}

	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&ids=%s&per_page=250",
		p.config.APIURL, strings.Join(coinIDs, ","))

	body, err := p.doRequest(url)
	if err != nil {
		return nil, err
	}

	var markets []coinGeckoMarket
	if err := json.Unmarshal(body, &markets); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	tickers := make([]*types.Ticker, len(markets))
	for i, m := range markets {
		tickers[i] = &types.Ticker{
			Symbol:         strings.ToUpper(m.Symbol),
			TradingPair:    strings.ToUpper(m.Symbol) + "USDT",
			Price:          decimal.NewFromFloat(m.CurrentPrice),
			PriceChange:    decimal.NewFromFloat(m.PriceChange24h),
			PriceChangePct: decimal.NewFromFloat(m.PriceChangePercentage24h),
			High24h:        decimal.NewFromFloat(m.High24h),
			Low24h:         decimal.NewFromFloat(m.Low24h),
			Volume24h:      decimal.NewFromFloat(m.TotalVolume),
			LastPrice:      decimal.NewFromFloat(m.CurrentPrice),
			Source:         types.DataSourceCoinGecko,
			Timestamp:      time.Now(),
		}
	}

	return tickers, nil
}

// pairToCoinID converts trading pair to CoinGecko coin ID
func (p *CoinGeckoProvider) pairToCoinID(pair string) string {
	// Common mappings
	mappings := map[string]string{
		"BTCUSDT":  "bitcoin",
		"ETHUSDT":  "ethereum",
		"BNBUSDT":  "binancecoin",
		"XRPUSDT":  "ripple",
		"ADAUSDT":  "cardano",
		"SOLUSDT":  "solana",
		"DOTUSDT":  "polkadot",
		"DOGEUSDT": "dogecoin",
		"AVAXUSDT": "avalanche-2",
		"MATICUSDT": "matic-network",
		"LINKUSDT": "chainlink",
		"UNIUSDT":  "uniswap",
		"ATOMUSDT": "cosmos",
		"LTCUSDT":  "litecoin",
	}

	if id, ok := mappings[pair]; ok {
		return id
	}

	// Default: lowercase symbol without quote currency
	symbol := strings.TrimSuffix(strings.TrimSuffix(pair, "USDT"), "USD")
	return strings.ToLower(symbol)
}


// GetMarketInfo returns detailed market information
func (p *CoinGeckoProvider) GetMarketInfo(ctx context.Context, symbol string) (*types.MarketInfo, error) {
	coinID := p.pairToCoinID(symbol + "USDT")

	url := fmt.Sprintf("%s/coins/%s?localization=false&tickers=false&community_data=false&developer_data=false",
		p.config.APIURL, coinID)

	body, err := p.doRequest(url)
	if err != nil {
		return nil, err
	}

	var data struct {
		ID         string `json:"id"`
		Symbol     string `json:"symbol"`
		Name       string `json:"name"`
		MarketData struct {
			CurrentPrice      map[string]float64 `json:"current_price"`
			MarketCap         map[string]float64 `json:"market_cap"`
			MarketCapRank     int                `json:"market_cap_rank"`
			TotalVolume       map[string]float64 `json:"total_volume"`
			CirculatingSupply float64            `json:"circulating_supply"`
			TotalSupply       float64            `json:"total_supply"`
			MaxSupply         float64            `json:"max_supply"`
			ATH               map[string]float64 `json:"ath"`
			ATHDate           map[string]string  `json:"ath_date"`
			ATL               map[string]float64 `json:"atl"`
			ATLDate           map[string]string  `json:"atl_date"`
		} `json:"market_data"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	athDate, _ := time.Parse(time.RFC3339, data.MarketData.ATHDate["usd"])
	atlDate, _ := time.Parse(time.RFC3339, data.MarketData.ATLDate["usd"])

	return &types.MarketInfo{
		Symbol:            strings.ToUpper(data.Symbol),
		Name:              data.Name,
		AssetType:         types.AssetTypeCrypto,
		MarketCap:         decimal.NewFromFloat(data.MarketData.MarketCap["usd"]),
		MarketCapRank:     data.MarketData.MarketCapRank,
		CirculatingSupply: decimal.NewFromFloat(data.MarketData.CirculatingSupply),
		TotalSupply:       decimal.NewFromFloat(data.MarketData.TotalSupply),
		MaxSupply:         decimal.NewFromFloat(data.MarketData.MaxSupply),
		ATH:               decimal.NewFromFloat(data.MarketData.ATH["usd"]),
		ATHDate:           athDate,
		ATL:               decimal.NewFromFloat(data.MarketData.ATL["usd"]),
		ATLDate:           atlDate,
		LastUpdated:       time.Now(),
	}, nil
}

// GetOrderbook - CoinGecko doesn't provide orderbook data
func (p *CoinGeckoProvider) GetOrderbook(ctx context.Context, pair string, limit int) (*types.OrderBook, error) {
	return nil, fmt.Errorf("orderbook not available from CoinGecko, use Binance")
}

// GetKlines - CoinGecko provides limited OHLC data
func (p *CoinGeckoProvider) GetKlines(ctx context.Context, pair, interval string, limit int) ([]*types.Kline, error) {
	coinID := p.pairToCoinID(pair)

	// CoinGecko OHLC endpoint: 1/7/14/30/90/180/365/max days
	days := "30"
	switch interval {
	case "1d":
		days = "30"
	case "1w":
		days = "90"
	}

	url := fmt.Sprintf("%s/coins/%s/ohlc?vs_currency=usd&days=%s", p.config.APIURL, coinID, days)

	body, err := p.doRequest(url)
	if err != nil {
		return nil, err
	}

	var rawData [][]float64
	if err := json.Unmarshal(body, &rawData); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	klines := make([]*types.Kline, len(rawData))
	for i, raw := range rawData {
		if len(raw) >= 5 {
			klines[i] = &types.Kline{
				TradingPair: pair,
				Interval:    interval,
				OpenTime:    time.UnixMilli(int64(raw[0])),
				Open:        decimal.NewFromFloat(raw[1]),
				High:        decimal.NewFromFloat(raw[2]),
				Low:         decimal.NewFromFloat(raw[3]),
				Close:       decimal.NewFromFloat(raw[4]),
				Source:      types.DataSourceCoinGecko,
			}
		}
	}

	return klines, nil
}

// GetRecentTrades - CoinGecko doesn't provide trade data
func (p *CoinGeckoProvider) GetRecentTrades(ctx context.Context, pair string, limit int) ([]*types.Trade, error) {
	return nil, fmt.Errorf("trades not available from CoinGecko, use Binance")
}

// WebSocket subscriptions - CoinGecko doesn't provide WebSocket
func (p *CoinGeckoProvider) SubscribeTicker(ctx context.Context, pairs []string, handler func(*types.Ticker)) error {
	return fmt.Errorf("WebSocket not available from CoinGecko, use Binance")
}

func (p *CoinGeckoProvider) SubscribeOrderbook(ctx context.Context, pair string, handler func(*types.OrderBook)) error {
	return fmt.Errorf("WebSocket not available from CoinGecko, use Binance")
}

func (p *CoinGeckoProvider) SubscribeTrades(ctx context.Context, pair string, handler func(*types.Trade)) error {
	return fmt.Errorf("WebSocket not available from CoinGecko, use Binance")
}

// Close closes the provider
func (p *CoinGeckoProvider) Close() error {
	return nil
}
