package types

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type OrderType string
type OrderSide string
type OrderStatus string
type TimeInForce string
type TradingType string
type MarginMode string

const (
	// Order Types
	OrderTypeMarket       OrderType = "MARKET"
	OrderTypeLimit        OrderType = "LIMIT"
	OrderTypeStopLoss     OrderType = "STOP_LOSS"
	OrderTypeStopLimit    OrderType = "STOP_LIMIT"
	OrderTypeTrailingStop OrderType = "TRAILING_STOP"
	OrderTypeIceberg      OrderType = "ICEBERG"

	// Order Sides
	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"

	// Order Status
	OrderStatusPending         OrderStatus = "PENDING"
	OrderStatusOpen            OrderStatus = "OPEN"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusRejected        OrderStatus = "REJECTED"
	OrderStatusExpired         OrderStatus = "EXPIRED"

	// Time In Force
	TimeInForceGTC TimeInForce = "GTC" // Good Till Cancel
	TimeInForceIOC TimeInForce = "IOC" // Immediate or Cancel
	TimeInForceFOK TimeInForce = "FOK" // Fill or Kill
	TimeInForceGTD TimeInForce = "GTD" // Good Till Date

	// Trading Types
	TradingTypeSpot    TradingType = "SPOT"
	TradingTypeMargin  TradingType = "MARGIN"
	TradingTypeFutures TradingType = "FUTURES"
	TradingTypeOptions TradingType = "OPTIONS"

	// Margin Modes
	MarginModeCross    MarginMode = "CROSS"
	MarginModeIsolated MarginMode = "ISOLATED"
)

type Order struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	TradingPair       string          `json:"trading_pair"`
	Type              OrderType       `json:"type"`
	Side              OrderSide       `json:"side"`
	Price             decimal.Decimal `json:"price"`
	Quantity          decimal.Decimal `json:"quantity"`
	FilledQuantity    decimal.Decimal `json:"filled_quantity"`
	RemainingQuantity decimal.Decimal `json:"remaining_quantity"`
	Status            OrderStatus     `json:"status"`
	TimeInForce       TimeInForce     `json:"time_in_force"`
	TradingType       TradingType     `json:"trading_type"`
	MarginMode        *MarginMode     `json:"margin_mode,omitempty"`
	Leverage          *decimal.Decimal `json:"leverage,omitempty"`
	
	// Stop orders
	StopPrice         *decimal.Decimal `json:"stop_price,omitempty"`
	TrailingDelta     *decimal.Decimal `json:"trailing_delta,omitempty"`
	
	// Iceberg orders
	DisplayQuantity   *decimal.Decimal `json:"display_quantity,omitempty"`
	
	// OCO orders
	LinkedOrderID     *uuid.UUID      `json:"linked_order_id,omitempty"`
	
	// Position management
	PositionID        *uuid.UUID      `json:"position_id,omitempty"`
	ReduceOnly        bool            `json:"reduce_only"`
	PostOnly          bool            `json:"post_only"`
	
	// Fees and execution
	MakerFee          decimal.Decimal `json:"maker_fee"`
	TakerFee          decimal.Decimal `json:"taker_fee"`
	
	// Timestamps
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	ExpiresAt         *time.Time      `json:"expires_at,omitempty"`
}

type Trade struct {
	ID              uuid.UUID       `json:"id"`
	TradingPair     string          `json:"trading_pair"`
	BuyOrderID      uuid.UUID       `json:"buy_order_id"`
	SellOrderID     uuid.UUID       `json:"sell_order_id"`
	BuyUserID       uuid.UUID       `json:"buy_user_id"`
	SellUserID      uuid.UUID       `json:"sell_user_id"`
	Price           decimal.Decimal `json:"price"`
	Quantity        decimal.Decimal `json:"quantity"`
	BuyerFee        decimal.Decimal `json:"buyer_fee"`
	SellerFee       decimal.Decimal `json:"seller_fee"`
	TradingType     TradingType     `json:"trading_type"`
	IsMaker         bool            `json:"is_maker"`
	Timestamp       time.Time       `json:"timestamp"`
}

type Position struct {
	ID              uuid.UUID       `json:"id"`
	UserID          uuid.UUID       `json:"user_id"`
	TradingPair     string          `json:"trading_pair"`
	Side            OrderSide       `json:"side"`
	Size            decimal.Decimal `json:"size"`
	EntryPrice      decimal.Decimal `json:"entry_price"`
	MarkPrice       decimal.Decimal `json:"mark_price"`
	LiquidationPrice decimal.Decimal `json:"liquidation_price"`
	Leverage        decimal.Decimal `json:"leverage"`
	Margin          decimal.Decimal `json:"margin"`
	MarginMode      MarginMode      `json:"margin_mode"`
	UnrealizedPnL   decimal.Decimal `json:"unrealized_pnl"`
	RealizedPnL     decimal.Decimal `json:"realized_pnl"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type Liquidation struct {
	ID              uuid.UUID       `json:"id"`
	PositionID      uuid.UUID       `json:"position_id"`
	UserID          uuid.UUID       `json:"user_id"`
	TradingPair     string          `json:"trading_pair"`
	Side            OrderSide       `json:"side"`
	Size            decimal.Decimal `json:"size"`
	LiquidationPrice decimal.Decimal `json:"liquidation_price"`
	Bankruptcy      decimal.Decimal `json:"bankruptcy_price"`
	InsuranceFund   decimal.Decimal `json:"insurance_fund_contribution"`
	Timestamp       time.Time       `json:"timestamp"`
}

type OrderBookLevel struct {
	Price    decimal.Decimal `json:"price"`
	Quantity decimal.Decimal `json:"quantity"`
	Orders   int             `json:"orders"`
}

type OrderBook struct {
	TradingPair string            `json:"trading_pair"`
	Bids        []OrderBookLevel  `json:"bids"`
	Asks        []OrderBookLevel  `json:"asks"`
	Timestamp   time.Time         `json:"timestamp"`
}

type Ticker struct {
	TradingPair       string          `json:"trading_pair"`
	LastPrice         decimal.Decimal `json:"last_price"`
	High24h           decimal.Decimal `json:"high_24h"`
	Low24h            decimal.Decimal `json:"low_24h"`
	Volume24h         decimal.Decimal `json:"volume_24h"`
	VolumeQuote24h    decimal.Decimal `json:"volume_quote_24h"`
	PriceChange24h    decimal.Decimal `json:"price_change_24h"`
	PriceChangePercent24h decimal.Decimal `json:"price_change_percent_24h"`
	Timestamp         time.Time       `json:"timestamp"`
}
