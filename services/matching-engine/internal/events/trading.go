package events

import (
	"time"

	"github.com/google/uuid"
)

// OrderPlacedEvent - Order placed (sent from trading service)
type OrderPlacedEvent struct {
	BaseEvent
	OrderID     uuid.UUID `json:"orderId"`
	UserID      uuid.UUID `json:"userId"`
	Pair        string    `json:"pair"`
	Side        string    `json:"side"`
	Type        string    `json:"type"`
	Price       string    `json:"price,omitempty"`
	StopPrice   string    `json:"stopPrice,omitempty"`
	Quantity    string    `json:"quantity"`
	TimeInForce string    `json:"timeInForce,omitempty"`
}

// TradeExecutedEvent - Trade executed
type TradeExecutedEvent struct {
	BaseEvent
	TradeID     uuid.UUID `json:"tradeId"`
	BuyOrderID  uuid.UUID `json:"buyOrderId"`
	SellOrderID uuid.UUID `json:"sellOrderId"`
	BuyUserID   uuid.UUID `json:"buyUserId"`
	SellUserID  uuid.UUID `json:"sellUserId"`
	Pair        string    `json:"pair"`
	Price       string    `json:"price"`
	Quantity    string    `json:"quantity"`
	BuyerFee    string    `json:"buyerFee"`
	SellerFee   string    `json:"sellerFee"`
	ExecutedAt  time.Time `json:"executedAt"`
	IsMaker     struct {
		Buy  bool `json:"buy"`
		Sell bool `json:"sell"`
	} `json:"isMaker"`
}

// OrderMatchedEvent - Order matched (partial or full)
type OrderMatchedEvent struct {
	BaseEvent
	OrderID            uuid.UUID `json:"orderId"`
	UserID             uuid.UUID `json:"userId"`
	Pair               string    `json:"pair"`
	FilledQuantity     string    `json:"filledQuantity"`
	RemainingQuantity  string    `json:"remainingQuantity"`
	AveragePrice       string    `json:"averagePrice"`
	Status             string    `json:"status"` // "partially_filled" | "filled"
}

// OrderBookUpdatedEvent - Order book updated
type OrderBookUpdatedEvent struct {
	BaseEvent
	Pair          string       `json:"pair"`
	Bids          [][2]string  `json:"bids"` // [price, quantity]
	Asks          [][2]string  `json:"asks"` // [price, quantity]
	LastUpdateID  int64        `json:"lastUpdateId"`
}

// MarketPriceUpdatedEvent - Market price updated
type MarketPriceUpdatedEvent struct {
	BaseEvent
	Pair           string `json:"pair"`
	Price          string `json:"price"`
	PriceChange24h string `json:"priceChange24h"`
	Volume24h      string `json:"volume24h"`
	High24h        string `json:"high24h"`
	Low24h         string `json:"low24h"`
}

// Helper to create TradeExecutedEvent
func NewTradeExecutedEvent(
	tradeID, buyOrderID, sellOrderID, buyUserID, sellUserID uuid.UUID,
	pair, price, quantity, buyerFee, sellerFee string,
	buyIsMaker, sellIsMaker bool,
) *TradeExecutedEvent {
	event := &TradeExecutedEvent{
		BaseEvent:   NewBaseEvent(),
		TradeID:     tradeID,
		BuyOrderID:  buyOrderID,
		SellOrderID: sellOrderID,
		BuyUserID:   buyUserID,
		SellUserID:  sellUserID,
		Pair:        pair,
		Price:       price,
		Quantity:    quantity,
		BuyerFee:    buyerFee,
		SellerFee:   sellerFee,
		ExecutedAt:  time.Now().UTC(),
	}
	event.IsMaker.Buy = buyIsMaker
	event.IsMaker.Sell = sellIsMaker
	return event
}
