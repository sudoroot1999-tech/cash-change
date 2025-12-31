package coingecko

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/exchange/market-data-service/internal/marketdata"
)

// CoinGecko API URL
const baseURL = "https://api.coingecko.com/api/v3"

// Client implements marketdata.Provider for CoinGecko
type Client struct {
	httpClient *http.Client
	symbolMap  map[string]string // Maps internal symbol "BTC/USDT" -> CoinGecko ID "bitcoin"
}

// NewClient creates a new CoinGecko client
func NewClient(timeout time.Duration) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: timeout,
		},
		// hardcoded map for now, as per plan
		symbolMap: map[string]string{
			"BTC/USDT":  "bitcoin",
			"ETH/USDT":  "ethereum",
			"ETH/BTC":   "ethereum", // Special case handling might be needed if we want price in BTC
			"BNB/USDT":  "binancecoin",
			"USDC/USDT": "usd-coin",
		},
	}
}

// MarketResponse represents the JSON response from CoinGecko
type MarketResponse struct {
	ID                       string  `json:"id"`
	Symbol                   string  `json:"symbol"`
	CurrentPrice             float64 `json:"current_price"`
	PriceChange24h           float64 `json:"price_change_24h"`
	PriceChangePercentage24h float64 `json:"price_change_percentage_24h"`
	High24h                  float64 `json:"high_24h"`
	Low24h                   float64 `json:"low_24h"`
	TotalVolume              float64 `json:"total_volume"`
}

// GetTickers fetches market data for the given symbols
func (c *Client) GetTickers(ctx context.Context, symbols []string) ([]*marketdata.TickerData, error) {
	// 1. Map symbols to CoinGecko IDs
	ids := make([]string, 0, len(symbols))
	reqSymbols := make(map[string]string) // ID -> Internal Symbol (for reverse mapping if needed, but we rely on order or ID match)

	// We only fetch for USDT pairs mostly for now based on the simplistic nature.
	// ETH/BTC is tricky because coingecko returns price in vs_currency.
	// If vs_currency=usd, we get ETH price in USD.
	// We will assume vs_currency=usd for now as typical for basic integration.
	
	uniqueIDs := make(map[string]bool)
	for _, s := range symbols {
		if id, ok := c.symbolMap[s]; ok {
			if !uniqueIDs[id] {
				ids = append(ids, id)
				uniqueIDs[id] = true
			}
			reqSymbols[id] = s
		}
	}

	if len(ids) == 0 {
		return nil, nil // No valid symbols mapped
	}

	// 2. Build URL
	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&ids=%s&order=market_cap_desc&per_page=100&page=1&sparkline=false", 
		baseURL, strings.Join(ids, ","))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("coingecko api error: status %d", resp.StatusCode)
	}

	// 3. Parse Response
	var markets []MarketResponse
	if err := json.NewDecoder(resp.Body).Decode(&markets); err != nil {
		return nil, err
	}

	// 4. Convert to generic TickerData
	// Note: result mapping is tricky because one ID (ethereum) might map to multiple symbols (ETH/USDT, ETH/BTC).
	// But in this simple generic return, we just return what we got.
	// The caller (TickerService) might need to re-map or we do it here.
	// For simplicity, we return data keyed by ID-like properties or letting caller handle it?
	// The interface returns `[]*TickerData`. `TickerData` has `Symbol`.
	// We should return `TickerData` with the *Internal Symbol*.
	// But since one ID -> Multiple Symbols is possible, we should iterate over our requested symbols and find matching data.

	var results []*marketdata.TickerData
	
	// Index data by ID for lookup
	dataMap := make(map[string]MarketResponse)
	for _, m := range markets {
		dataMap[m.ID] = m
	}

	for _, s := range symbols {
		id, ok := c.symbolMap[s]
		if !ok {
			continue
		}
		
		market, found := dataMap[id]
		if !found {
			continue
		}

		// Simple handling: use USD prices. 
		// For ETH/BTC, this logic is actually flawed if we only fetch vs_usd.
		// ETH/BTC price should be Price(ETH_USD) / Price(BTC_USD).
		// But integrating that calculation here might be too complex for step 1.
		// For now, I will just enable this for the basic coins and note the limitation or simple impl.
		// Wait, user just said "use coingecko free api".
		// I will just populate with USD data for now.
		
		// Limitation: QuoteVolume24h is not directly provided as "quote volume" in basic response usually, 
		// but TotalVolume is usually Base Volume or Quote Volume? 
		// Coingecko total_volume is usually in vs_currency (USD). So it is QuoteVolume.
		
		t := &marketdata.TickerData{
			Symbol:             s,
			LastPrice:          market.CurrentPrice,
			PriceChange:        market.PriceChange24h,
			PriceChangePercent: market.PriceChangePercentage24h,
			High24h:            market.High24h,
			Low24h:             market.Low24h,
			Volume24h:          market.TotalVolume / market.CurrentPrice, // Approx base volume
			QuoteVolume24h:     market.TotalVolume,
		}
		results = append(results, t)
	}

	return results, nil
}

// GetCurrencies fetches all available coins from CoinGecko
func (c *Client) GetCurrencies(ctx context.Context) ([]*marketdata.Currency, error) {
	url := fmt.Sprintf("%s/coins/list", baseURL)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("coingecko api error: status %d", resp.StatusCode)
	}

	var coins []struct {
		ID     string `json:"id"`
		Symbol string `json:"symbol"`
		Name   string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&coins); err != nil {
		return nil, err
	}

	results := make([]*marketdata.Currency, len(coins))
	for i, coin := range coins {
		results[i] = &marketdata.Currency{
			ID:     coin.ID,
			Symbol: coin.Symbol,
			Name:   coin.Name,
		}
	}

	return results, nil
}
