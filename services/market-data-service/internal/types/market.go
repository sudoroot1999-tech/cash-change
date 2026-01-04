package types

import (
	"time"

	"github.com/shopspring/decimal"
)

// AssetType represents the type of asset
type AssetType string

const (
	AssetTypeCrypto AssetType = "CRYPTO"
	AssetTypeNFT    AssetType = "NFT"
	AssetTypeRWA    AssetType = "RWA" // Real World Assets
	AssetTypeToken  AssetType = "TOKEN"
)

// DataSource represents the source of market data
type DataSource string

const (
	DataSourceBinance   DataSource = "BINANCE"
	DataSourceCoinGecko DataSource = "COINGECKO"
	DataSourceInternal  DataSource = "INTERNAL"
)

// Ticker represents real-time price data
type Ticker struct {
	Symbol        string          `json:"symbol"`
	TradingPair   string          `json:"trading_pair"`
	Price         decimal.Decimal `json:"price"`
	PriceChange   decimal.Decimal `json:"price_change"`
	PriceChangePct decimal.Decimal `json:"price_change_pct"`
	High24h       decimal.Decimal `json:"high_24h"`
	Low24h        decimal.Decimal `json:"low_24h"`
	Volume24h     decimal.Decimal `json:"volume_24h"`
	QuoteVolume   decimal.Decimal `json:"quote_volume"`
	OpenPrice     decimal.Decimal `json:"open_price"`
	LastPrice     decimal.Decimal `json:"last_price"`
	BidPrice      decimal.Decimal `json:"bid_price"`
	AskPrice      decimal.Decimal `json:"ask_price"`
	Source        DataSource      `json:"source"`
	Timestamp     time.Time       `json:"timestamp"`
}


// OrderBook represents the order book for a trading pair
type OrderBook struct {
	TradingPair  string          `json:"trading_pair"`
	Bids         []PriceLevel    `json:"bids"`
	Asks         []PriceLevel    `json:"asks"`
	LastUpdateID int64           `json:"last_update_id"`
	Source       DataSource      `json:"source"`
	Timestamp    time.Time       `json:"timestamp"`
}

// PriceLevel represents a single price level in the order book
type PriceLevel struct {
	Price    decimal.Decimal `json:"price"`
	Quantity decimal.Decimal `json:"quantity"`
}

// Kline represents candlestick/OHLCV data
type Kline struct {
	TradingPair string          `json:"trading_pair"`
	Interval    string          `json:"interval"` // 1m, 5m, 15m, 1h, 4h, 1d, 1w
	OpenTime    time.Time       `json:"open_time"`
	CloseTime   time.Time       `json:"close_time"`
	Open        decimal.Decimal `json:"open"`
	High        decimal.Decimal `json:"high"`
	Low         decimal.Decimal `json:"low"`
	Close       decimal.Decimal `json:"close"`
	Volume      decimal.Decimal `json:"volume"`
	QuoteVolume decimal.Decimal `json:"quote_volume"`
	TradeCount  int64           `json:"trade_count"`
	Source      DataSource      `json:"source"`
}

// Trade represents a single trade
type Trade struct {
	ID          string          `json:"id"`
	TradingPair string          `json:"trading_pair"`
	Price       decimal.Decimal `json:"price"`
	Quantity    decimal.Decimal `json:"quantity"`
	Side        string          `json:"side"` // BUY or SELL
	Timestamp   time.Time       `json:"timestamp"`
	Source      DataSource      `json:"source"`
}

// MarketInfo represents market information for an asset
type MarketInfo struct {
	Symbol           string          `json:"symbol"`
	Name             string          `json:"name"`
	AssetType        AssetType       `json:"asset_type"`
	MarketCap        decimal.Decimal `json:"market_cap"`
	MarketCapRank    int             `json:"market_cap_rank"`
	CirculatingSupply decimal.Decimal `json:"circulating_supply"`
	TotalSupply      decimal.Decimal `json:"total_supply"`
	MaxSupply        decimal.Decimal `json:"max_supply"`
	ATH              decimal.Decimal `json:"ath"`
	ATHDate          time.Time       `json:"ath_date"`
	ATL              decimal.Decimal `json:"atl"`
	ATLDate          time.Time       `json:"atl_date"`
	LastUpdated      time.Time       `json:"last_updated"`
}


// TradingPair represents a trading pair configuration
type TradingPair struct {
	ID              string          `json:"id"`
	Symbol          string          `json:"symbol"`          // e.g., "BTCUSDT"
	BaseAsset       string          `json:"base_asset"`      // e.g., "BTC"
	QuoteAsset      string          `json:"quote_asset"`     // e.g., "USDT"
	AssetType       AssetType       `json:"asset_type"`
	Status          string          `json:"status"`          // ACTIVE, INACTIVE, SUSPENDED
	MinPrice        decimal.Decimal `json:"min_price"`
	MaxPrice        decimal.Decimal `json:"max_price"`
	TickSize        decimal.Decimal `json:"tick_size"`
	MinQuantity     decimal.Decimal `json:"min_quantity"`
	MaxQuantity     decimal.Decimal `json:"max_quantity"`
	StepSize        decimal.Decimal `json:"step_size"`
	MinNotional     decimal.Decimal `json:"min_notional"`
	PricePrecision  int             `json:"price_precision"`
	QuantityPrecision int           `json:"quantity_precision"`
	ExternalSymbol  string          `json:"external_symbol"` // Symbol on external exchange
	DataSources     []DataSource    `json:"data_sources"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// NFTCollection represents an NFT collection for market data
type NFTCollection struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	ContractAddress string          `json:"contract_address"`
	Chain           string          `json:"chain"`
	FloorPrice      decimal.Decimal `json:"floor_price"`
	Volume24h       decimal.Decimal `json:"volume_24h"`
	Volume7d        decimal.Decimal `json:"volume_7d"`
	MarketCap       decimal.Decimal `json:"market_cap"`
	Owners          int64           `json:"owners"`
	TotalSupply     int64           `json:"total_supply"`
	LastUpdated     time.Time       `json:"last_updated"`
}

// RWAAsset represents a Real World Asset
type RWAAsset struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	AssetClass      string          `json:"asset_class"` // REAL_ESTATE, COMMODITY, BOND, etc.
	Price           decimal.Decimal `json:"price"`
	NAV             decimal.Decimal `json:"nav"` // Net Asset Value
	Yield           decimal.Decimal `json:"yield"`
	TotalValue      decimal.Decimal `json:"total_value"`
	TokenizedAmount decimal.Decimal `json:"tokenized_amount"`
	LastUpdated     time.Time       `json:"last_updated"`
}
