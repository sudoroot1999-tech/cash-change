package types

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Order types
type OrderType string

const (
	OrderTypeMarket       OrderType = "MARKET"
	OrderTypeLimit        OrderType = "LIMIT"
	OrderTypeStopLoss     OrderType = "STOP_LOSS"
	OrderTypeStopLimit    OrderType = "STOP_LIMIT"
	OrderTypeTakeProfit   OrderType = "TAKE_PROFIT"
	OrderTypeTrailingStop OrderType = "TRAILING_STOP"
	OrderTypeIceberg      OrderType = "ICEBERG"
)

// Order sides
type OrderSide string

const (
	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"
)

// Order status
type OrderStatus string

const (
	OrderStatusPending         OrderStatus = "PENDING"
	OrderStatusOpen            OrderStatus = "OPEN"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusRejected        OrderStatus = "REJECTED"
	OrderStatusExpired         OrderStatus = "EXPIRED"
)

// Time in force
type TimeInForce string

const (
	TimeInForceGTC TimeInForce = "GTC" // Good Till Cancel
	TimeInForceIOC TimeInForce = "IOC" // Immediate Or Cancel
	TimeInForceFOK TimeInForce = "FOK" // Fill Or Kill
	TimeInForceGTD TimeInForce = "GTD" // Good Till Date
)

// Trading type
type TradingType string

const (
	TradingTypeSpot    TradingType = "SPOT"
	TradingTypeMargin  TradingType = "MARGIN"
	TradingTypeFutures TradingType = "FUTURES"
	TradingTypeOptions TradingType = "OPTIONS"
)

// Margin mode
type MarginMode string

const (
	MarginModeCross    MarginMode = "CROSS"
	MarginModeIsolated MarginMode = "ISOLATED"
)

// Order represents a trading order
type Order struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"userId"`
	TradingPair       string          `json:"tradingPair"`
	Type              OrderType       `json:"type"`
	Side              OrderSide       `json:"side"`
	Price             decimal.Decimal `json:"price"`
	Quantity          decimal.Decimal `json:"quantity"`
	FilledQuantity    decimal.Decimal `json:"filledQuantity"`
	RemainingQuantity decimal.Decimal `json:"remainingQuantity"`
	Status            OrderStatus     `json:"status"`
	TimeInForce       TimeInForce     `json:"timeInForce"`
	TradingType       TradingType     `json:"tradingType"`
	MarginMode        MarginMode      `json:"marginMode,omitempty"`
	Leverage          decimal.Decimal `json:"leverage,omitempty"`
	StopPrice         decimal.Decimal `json:"stopPrice,omitempty"`
	DisplayQuantity   *decimal.Decimal `json:"displayQuantity,omitempty"`
	MakerFee          decimal.Decimal `json:"makerFee"`
	TakerFee          decimal.Decimal `json:"takerFee"`
	ReduceOnly        bool            `json:"reduceOnly"`
	PostOnly          bool            `json:"postOnly"`
	LinkedOrderID     *uuid.UUID      `json:"linkedOrderId,omitempty"`
	ClientOrderID     string          `json:"clientOrderId,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Trade represents an executed trade
type Trade struct {
	ID          uuid.UUID       `json:"id"`
	BuyOrderID  uuid.UUID       `json:"buyOrderId"`
	SellOrderID uuid.UUID       `json:"sellOrderId"`
	BuyUserID   uuid.UUID       `json:"buyUserId"`
	SellUserID  uuid.UUID       `json:"sellUserId"`
	TradingPair string          `json:"tradingPair"`
	Price       decimal.Decimal `json:"price"`
	Quantity    decimal.Decimal `json:"quantity"`
	BuyerFee    decimal.Decimal `json:"buyerFee"`
	SellerFee   decimal.Decimal `json:"sellerFee"`
	TradingType TradingType     `json:"tradingType"`
	Timestamp   time.Time       `json:"timestamp"`
}

// Position represents a futures/margin position
type Position struct {
	ID               uuid.UUID       `json:"id"`
	UserID           uuid.UUID       `json:"userId"`
	TradingPair      string          `json:"tradingPair"`
	Side             OrderSide       `json:"side"`
	Size             decimal.Decimal `json:"size"`
	EntryPrice       decimal.Decimal `json:"entryPrice"`
	MarkPrice        decimal.Decimal `json:"markPrice"`
	LiquidationPrice decimal.Decimal `json:"liquidationPrice"`
	Leverage         decimal.Decimal `json:"leverage"`
	MarginMode       MarginMode      `json:"marginMode"`
	Margin           decimal.Decimal `json:"margin"`
	UnrealizedPnL    decimal.Decimal `json:"unrealizedPnl"`
	RealizedPnL      decimal.Decimal `json:"realizedPnl"`
	TradingType      TradingType     `json:"tradingType"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// Liquidation represents a liquidation event
type Liquidation struct {
	ID               uuid.UUID       `json:"id"`
	PositionID       uuid.UUID       `json:"positionId"`
	UserID           uuid.UUID       `json:"userId"`
	TradingPair      string          `json:"tradingPair"`
	Side             OrderSide       `json:"side"`
	Size             decimal.Decimal `json:"size"`
	LiquidationPrice decimal.Decimal `json:"liquidationPrice"`
	Timestamp        time.Time       `json:"timestamp"`
}

// TradingPair represents a trading pair configuration
type TradingPair struct {
	Symbol       string          `json:"symbol"`
	BaseAsset    string          `json:"baseAsset"`
	QuoteAsset   string          `json:"quoteAsset"`
	MinOrderSize decimal.Decimal `json:"minOrderSize"`
	MaxOrderSize decimal.Decimal `json:"maxOrderSize"`
	PricePrecision int           `json:"pricePrecision"`
	QuantityPrecision int        `json:"quantityPrecision"`
	MakerFee     decimal.Decimal `json:"makerFee"`
	TakerFee     decimal.Decimal `json:"takerFee"`
	Status       string          `json:"status"`
}

// Ticker represents market ticker data
type Ticker struct {
	TradingPair          string          `json:"tradingPair"`
	LastPrice            decimal.Decimal `json:"lastPrice"`
	BidPrice             decimal.Decimal `json:"bidPrice"`
	AskPrice             decimal.Decimal `json:"askPrice"`
	High24h              decimal.Decimal `json:"high24h"`
	Low24h               decimal.Decimal `json:"low24h"`
	Volume24h            decimal.Decimal `json:"volume24h"`
	VolumeQuote24h       decimal.Decimal `json:"volumeQuote24h"`
	PriceChange24h       decimal.Decimal `json:"priceChange24h"`
	PriceChangePercent24h decimal.Decimal `json:"priceChangePercent24h"`
	Timestamp            time.Time       `json:"timestamp"`
}

// OrderBook represents order book data
type OrderBook struct {
	TradingPair string           `json:"tradingPair"`
	Bids        []OrderBookLevel `json:"bids"`
	Asks        []OrderBookLevel `json:"asks"`
	Timestamp   time.Time        `json:"timestamp"`
}

// OrderBookLevel represents a price level in the order book
type OrderBookLevel struct {
	Price    decimal.Decimal `json:"price"`
	Quantity decimal.Decimal `json:"quantity"`
}
