package events

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// OrderReceivedEvent - Order received by matching engine
type OrderReceivedEvent struct {
	BaseEvent
	OrderID   uuid.UUID `json:"orderId"`
	UserID    uuid.UUID `json:"userId"`
	Pair      string    `json:"pair"`
	Side      string    `json:"side"` // "buy" | "sell"
	Type      string    `json:"type"` // "market" | "limit" | "stop-loss" | "stop-limit"
	Price     string    `json:"price,omitempty"`
	Quantity  string    `json:"quantity"`
	ReceivedAt time.Time `json:"receivedAt"`
}

// OrderMatchEvent - Order matched by engine
type OrderMatchEvent struct {
	BaseEvent
	BuyOrderID  uuid.UUID `json:"buyOrderId"`
	SellOrderID uuid.UUID `json:"sellOrderId"`
	Pair        string    `json:"pair"`
	Price       string    `json:"price"`
	Quantity    string    `json:"quantity"`
	BuyUserID   uuid.UUID `json:"buyUserId"`
	SellUserID  uuid.UUID `json:"sellUserId"`
	MatchedAt   time.Time `json:"matchedAt"`
}

// OrderBookStateChangedEvent - Order book state changed
type OrderBookStateChangedEvent struct {
	BaseEvent
	Pair         string `json:"pair"`
	BidsCount    int    `json:"bidsCount"`
	AsksCount    int    `json:"asksCount"`
	TopBidPrice  string `json:"topBidPrice,omitempty"`
	TopAskPrice  string `json:"topAskPrice,omitempty"`
	Spread       string `json:"spread,omitempty"`
}

// MatchingEngineHealthEvent - Health status event
type MatchingEngineHealthEvent struct {
	BaseEvent
	InstanceID         string  `json:"instanceId"`
	Status             string  `json:"status"` // "healthy" | "degraded" | "unhealthy"
	QueueDepth         int     `json:"queueDepth"`
	MatchesPerSecond   float64 `json:"matchesPerSecond"`
	LatencyMs          float64 `json:"latencyMs"`
}

// OrderBookSnapshotCreatedEvent - Snapshot created for recovery
type OrderBookSnapshotCreatedEvent struct {
	BaseEvent
	Pair            string    `json:"pair"`
	SnapshotID      string    `json:"snapshotId"`
	OrdersCount     int       `json:"ordersCount"`
	CreatedAt       time.Time `json:"createdAt"`
	StorageLocation string    `json:"storageLocation"`
}

// MarketMakerOrderEvent - Market maker order event
type MarketMakerOrderEvent struct {
	BaseEvent
	MarketMakerID string    `json:"marketMakerId"`
	OrderID       uuid.UUID `json:"orderId"`
	Pair          string    `json:"pair"`
	Side          string    `json:"side"`
	Price         string    `json:"price"`
	Quantity      string    `json:"quantity"`
	IsUpdate      bool      `json:"isUpdate"`
}

// LiquidityPoolUpdatedEvent - Liquidity pool event
type LiquidityPoolUpdatedEvent struct {
	BaseEvent
	Pair              string  `json:"pair"`
	TotalBidVolume    string  `json:"totalBidVolume"`
	TotalAskVolume    string  `json:"totalAskVolume"`
	SpreadPercentage  float64 `json:"spreadPercentage"`
	MarketMakersCount int     `json:"marketMakersCount"`
}

// CircuitBreakerTriggeredEvent - Circuit breaker triggered
type CircuitBreakerTriggeredEvent struct {
	BaseEvent
	Pair                   string     `json:"pair"`
	Reason                 string     `json:"reason"` // "price_deviation" | "volume_spike" | "manual"
	PreviousPrice          string     `json:"previousPrice"`
	CurrentPrice           string     `json:"currentPrice"`
	PriceChangePercentage  float64    `json:"priceChangePercentage"`
	PausedUntil            *time.Time `json:"pausedUntil,omitempty"`
}

// TradingResumedEvent - Trading resumed
type TradingResumedEvent struct {
	BaseEvent
	Pair           string `json:"pair"`
	ResumedBy      string `json:"resumedBy"`
	PausedDuration int64  `json:"pausedDuration"` // seconds
}

// Helper function to convert decimal to string for JSON
func DecimalToString(d decimal.Decimal) string {
	return d.String()
}

// Helper to create OrderReceivedEvent
func NewOrderReceivedEvent(orderID, userID uuid.UUID, pair, side, orderType, price, quantity string) *OrderReceivedEvent {
	return &OrderReceivedEvent{
		BaseEvent:  NewBaseEvent(),
		OrderID:    orderID,
		UserID:     userID,
		Pair:       pair,
		Side:       side,
		Type:       orderType,
		Price:      price,
		Quantity:   quantity,
		ReceivedAt: time.Now().UTC(),
	}
}

// Helper to create OrderMatchEvent
func NewOrderMatchEvent(buyOrderID, sellOrderID, buyUserID, sellUserID uuid.UUID, pair, price, quantity string) *OrderMatchEvent {
	return &OrderMatchEvent{
		BaseEvent:   NewBaseEvent(),
		BuyOrderID:  buyOrderID,
		SellOrderID: sellOrderID,
		Pair:        pair,
		Price:       price,
		Quantity:    quantity,
		BuyUserID:   buyUserID,
		SellUserID:  sellUserID,
		MatchedAt:   time.Now().UTC(),
	}
}
