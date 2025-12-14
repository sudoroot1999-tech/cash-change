package engine

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// OrderSide represents buy or sell
type OrderSide string

const (
	Buy  OrderSide = "buy"
	Sell OrderSide = "sell"
)

// OrderType represents the order type
type OrderType string

const (
	Market    OrderType = "market"
	Limit     OrderType = "limit"
	StopLoss  OrderType = "stop_loss"
	StopLimit OrderType = "stop_limit"
)

// OrderStatus represents the order status
type OrderStatus string

const (
	Pending   OrderStatus = "pending"
	Open      OrderStatus = "open"
	Partial   OrderStatus = "partial"
	Filled    OrderStatus = "filled"
	Cancelled OrderStatus = "cancelled"
)

// Order represents a trading order
type Order struct {
	ID               string          `json:"id"`
	UserID           string          `json:"userId"`
	Symbol           string          `json:"symbol"`
	Side             OrderSide       `json:"side"`
	Type             OrderType       `json:"type"`
	Status           OrderStatus     `json:"status"`
	Price            decimal.Decimal `json:"price"`
	Quantity         decimal.Decimal `json:"quantity"`
	FilledQuantity   decimal.Decimal `json:"filledQuantity"`
	RemainingQty     decimal.Decimal `json:"remainingQuantity"`
	StopPrice        decimal.Decimal `json:"stopPrice,omitempty"`
	TimeInForce      string          `json:"timeInForce"`
	ClientOrderID    string          `json:"clientOrderId,omitempty"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// Trade represents an executed trade
type Trade struct {
	ID            string          `json:"id"`
	Symbol        string          `json:"symbol"`
	BuyerOrderID  string          `json:"buyerOrderId"`
	SellerOrderID string          `json:"sellerOrderId"`
	BuyerID       string          `json:"buyerId"`
	SellerID      string          `json:"sellerId"`
	Price         decimal.Decimal `json:"price"`
	Quantity      decimal.Decimal `json:"quantity"`
	IsBuyerMaker  bool            `json:"isBuyerMaker"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// PriceLevel represents a price level in the order book
type PriceLevel struct {
	Price    decimal.Decimal `json:"price"`
	Quantity decimal.Decimal `json:"quantity"`
	Orders   []*Order        `json:"-"`
}

// OrderBook represents the order book for a trading pair
type OrderBook struct {
	Symbol      string                      `json:"symbol"`
	Bids        map[string]*PriceLevel      // price -> level (sorted desc)
	Asks        map[string]*PriceLevel      // price -> level (sorted asc)
	bidLevels   []decimal.Decimal           // sorted bid prices (desc)
	askLevels   []decimal.Decimal           // sorted ask prices (asc)
	orders      map[string]*Order           // orderId -> order
	mu          sync.RWMutex
}

// MatchingEngine is the core order matching engine
type MatchingEngine struct {
	orderBooks   map[string]*OrderBook
	trades       map[string][]*Trade
	mu           sync.RWMutex
	logger       *zap.Logger
	tradeHandler func(*Trade)
	stats        *EngineStats
}

// EngineStats tracks engine performance
type EngineStats struct {
	OrdersProcessed   int64     `json:"ordersProcessed"`
	TradesExecuted    int64     `json:"tradesExecuted"`
	OrdersCancelled   int64     `json:"ordersCancelled"`
	AvgMatchTimeNs    int64     `json:"avgMatchTimeNs"`
	LastMatchTimeNs   int64     `json:"lastMatchTimeNs"`
	StartedAt         time.Time `json:"startedAt"`
	mu                sync.Mutex
}

// NewMatchingEngine creates a new matching engine
func NewMatchingEngine(logger *zap.Logger) *MatchingEngine {
	return &MatchingEngine{
		orderBooks: make(map[string]*OrderBook),
		trades:     make(map[string][]*Trade),
		logger:     logger,
		stats: &EngineStats{
			StartedAt: time.Now(),
		},
	}
}

// SetTradeHandler sets the callback for executed trades
func (e *MatchingEngine) SetTradeHandler(handler func(*Trade)) {
	e.tradeHandler = handler
}

// GetOrCreateOrderBook gets or creates an order book for a symbol
func (e *MatchingEngine) GetOrCreateOrderBook(symbol string) *OrderBook {
	e.mu.Lock()
	defer e.mu.Unlock()

	if ob, exists := e.orderBooks[symbol]; exists {
		return ob
	}

	ob := &OrderBook{
		Symbol:    symbol,
		Bids:      make(map[string]*PriceLevel),
		Asks:      make(map[string]*PriceLevel),
		bidLevels: []decimal.Decimal{},
		askLevels: []decimal.Decimal{},
		orders:    make(map[string]*Order),
	}
	e.orderBooks[symbol] = ob
	return ob
}

// SubmitOrder submits an order to the matching engine
func (e *MatchingEngine) SubmitOrder(order *Order) ([]*Trade, error) {
	start := time.Now()
	defer func() {
		e.stats.mu.Lock()
		e.stats.OrdersProcessed++
		e.stats.LastMatchTimeNs = time.Since(start).Nanoseconds()
		e.stats.mu.Unlock()
	}()

	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	order.CreatedAt = time.Now()
	order.UpdatedAt = order.CreatedAt
	order.RemainingQty = order.Quantity
	order.FilledQuantity = decimal.Zero
	order.Status = Open

	ob := e.GetOrCreateOrderBook(order.Symbol)
	
	var trades []*Trade

	if order.Type == Market {
		trades = e.matchMarketOrder(ob, order)
	} else if order.Type == Limit {
		trades = e.matchLimitOrder(ob, order)
	}

	// If order still has remaining quantity, add to book
	if order.RemainingQty.GreaterThan(decimal.Zero) && order.Type == Limit {
		e.addToOrderBook(ob, order)
	}

	// Update stats
	e.stats.mu.Lock()
	e.stats.TradesExecuted += int64(len(trades))
	e.stats.mu.Unlock()

	// Store and notify trades
	if len(trades) > 0 {
		e.mu.Lock()
		e.trades[order.Symbol] = append(e.trades[order.Symbol], trades...)
		// Keep only last 1000 trades
		if len(e.trades[order.Symbol]) > 1000 {
			e.trades[order.Symbol] = e.trades[order.Symbol][len(e.trades[order.Symbol])-1000:]
		}
		e.mu.Unlock()

		for _, trade := range trades {
			if e.tradeHandler != nil {
				e.tradeHandler(trade)
			}
		}
	}

	e.logger.Debug("Order processed",
		zap.String("orderId", order.ID),
		zap.String("symbol", order.Symbol),
		zap.String("side", string(order.Side)),
		zap.String("status", string(order.Status)),
		zap.Int("trades", len(trades)),
		zap.Duration("latency", time.Since(start)),
	)

	return trades, nil
}

// matchMarketOrder matches a market order against the order book
func (e *MatchingEngine) matchMarketOrder(ob *OrderBook, order *Order) []*Trade {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	var trades []*Trade
	var levels []decimal.Decimal

	if order.Side == Buy {
		levels = ob.askLevels
	} else {
		levels = ob.bidLevels
	}

	for _, price := range levels {
		if order.RemainingQty.IsZero() {
			break
		}

		var level *PriceLevel
		if order.Side == Buy {
			level = ob.Asks[price.String()]
		} else {
			level = ob.Bids[price.String()]
		}

		if level == nil {
			continue
		}

		trades = append(trades, e.matchAtLevel(ob, order, level, price)...)
	}

	if order.RemainingQty.IsZero() {
		order.Status = Filled
	} else if order.FilledQuantity.GreaterThan(decimal.Zero) {
		order.Status = Partial
	}

	return trades
}

// matchLimitOrder matches a limit order against the order book
func (e *MatchingEngine) matchLimitOrder(ob *OrderBook, order *Order) []*Trade {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	var trades []*Trade
	var levels []decimal.Decimal

	if order.Side == Buy {
		levels = ob.askLevels
	} else {
		levels = ob.bidLevels
	}

	for _, price := range levels {
		if order.RemainingQty.IsZero() {
			break
		}

		// Check price crossing
		if order.Side == Buy && price.GreaterThan(order.Price) {
			break
		}
		if order.Side == Sell && price.LessThan(order.Price) {
			break
		}

		var level *PriceLevel
		if order.Side == Buy {
			level = ob.Asks[price.String()]
		} else {
			level = ob.Bids[price.String()]
		}

		if level == nil {
			continue
		}

		trades = append(trades, e.matchAtLevel(ob, order, level, price)...)
	}

	if order.RemainingQty.IsZero() {
		order.Status = Filled
	} else if order.FilledQuantity.GreaterThan(decimal.Zero) {
		order.Status = Partial
	}

	return trades
}

// matchAtLevel matches an order at a specific price level
func (e *MatchingEngine) matchAtLevel(ob *OrderBook, taker *Order, level *PriceLevel, price decimal.Decimal) []*Trade {
	var trades []*Trade
	var remainingOrders []*Order

	for _, maker := range level.Orders {
		if taker.RemainingQty.IsZero() {
			remainingOrders = append(remainingOrders, maker)
			continue
		}

		// Self-trade prevention
		if taker.UserID == maker.UserID {
			remainingOrders = append(remainingOrders, maker)
			continue
		}

		// Calculate fill quantity
		fillQty := decimal.Min(taker.RemainingQty, maker.RemainingQty)

		// Create trade
		trade := &Trade{
			ID:        uuid.New().String(),
			Symbol:    taker.Symbol,
			Price:     price,
			Quantity:  fillQty,
			CreatedAt: time.Now(),
		}

		if taker.Side == Buy {
			trade.BuyerOrderID = taker.ID
			trade.SellerOrderID = maker.ID
			trade.BuyerID = taker.UserID
			trade.SellerID = maker.UserID
			trade.IsBuyerMaker = false
		} else {
			trade.BuyerOrderID = maker.ID
			trade.SellerOrderID = taker.ID
			trade.BuyerID = maker.UserID
			trade.SellerID = taker.UserID
			trade.IsBuyerMaker = true
		}

		trades = append(trades, trade)

		// Update quantities
		taker.FilledQuantity = taker.FilledQuantity.Add(fillQty)
		taker.RemainingQty = taker.RemainingQty.Sub(fillQty)
		maker.FilledQuantity = maker.FilledQuantity.Add(fillQty)
		maker.RemainingQty = maker.RemainingQty.Sub(fillQty)
		maker.UpdatedAt = time.Now()

		if maker.RemainingQty.IsZero() {
			maker.Status = Filled
			delete(ob.orders, maker.ID)
		} else {
			maker.Status = Partial
			remainingOrders = append(remainingOrders, maker)
		}
	}

	// Update level
	level.Orders = remainingOrders
	level.Quantity = decimal.Zero
	for _, o := range remainingOrders {
		level.Quantity = level.Quantity.Add(o.RemainingQty)
	}

	// Remove empty level
	if level.Quantity.IsZero() {
		if taker.Side == Buy {
			delete(ob.Asks, price.String())
			ob.askLevels = removePrice(ob.askLevels, price)
		} else {
			delete(ob.Bids, price.String())
			ob.bidLevels = removePrice(ob.bidLevels, price)
		}
	}

	return trades
}

// addToOrderBook adds an order to the order book
func (e *MatchingEngine) addToOrderBook(ob *OrderBook, order *Order) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	priceStr := order.Price.String()
	ob.orders[order.ID] = order

	if order.Side == Buy {
		level, exists := ob.Bids[priceStr]
		if !exists {
			level = &PriceLevel{
				Price:    order.Price,
				Quantity: decimal.Zero,
				Orders:   []*Order{},
			}
			ob.Bids[priceStr] = level
			ob.bidLevels = insertPriceDesc(ob.bidLevels, order.Price)
		}
		level.Orders = append(level.Orders, order)
		level.Quantity = level.Quantity.Add(order.RemainingQty)
	} else {
		level, exists := ob.Asks[priceStr]
		if !exists {
			level = &PriceLevel{
				Price:    order.Price,
				Quantity: decimal.Zero,
				Orders:   []*Order{},
			}
			ob.Asks[priceStr] = level
			ob.askLevels = insertPriceAsc(ob.askLevels, order.Price)
		}
		level.Orders = append(level.Orders, order)
		level.Quantity = level.Quantity.Add(order.RemainingQty)
	}
}

// CancelOrder cancels an order
func (e *MatchingEngine) CancelOrder(symbol, orderID string) (*Order, error) {
	ob := e.GetOrCreateOrderBook(symbol)
	ob.mu.Lock()
	defer ob.mu.Unlock()

	order, exists := ob.orders[orderID]
	if !exists {
		return nil, nil
	}

	order.Status = Cancelled
	order.UpdatedAt = time.Now()
	delete(ob.orders, orderID)

	// Remove from price level
	priceStr := order.Price.String()
	if order.Side == Buy {
		if level, ok := ob.Bids[priceStr]; ok {
			level.Orders = removeOrder(level.Orders, orderID)
			level.Quantity = level.Quantity.Sub(order.RemainingQty)
			if len(level.Orders) == 0 {
				delete(ob.Bids, priceStr)
				ob.bidLevels = removePrice(ob.bidLevels, order.Price)
			}
		}
	} else {
		if level, ok := ob.Asks[priceStr]; ok {
			level.Orders = removeOrder(level.Orders, orderID)
			level.Quantity = level.Quantity.Sub(order.RemainingQty)
			if len(level.Orders) == 0 {
				delete(ob.Asks, priceStr)
				ob.askLevels = removePrice(ob.askLevels, order.Price)
			}
		}
	}

	e.stats.mu.Lock()
	e.stats.OrdersCancelled++
	e.stats.mu.Unlock()

	return order, nil
}

// GetOrderBook returns the order book depth
func (e *MatchingEngine) GetOrderBook(symbol string, depth int) ([]PriceLevel, []PriceLevel) {
	ob := e.GetOrCreateOrderBook(symbol)
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	bids := make([]PriceLevel, 0, depth)
	asks := make([]PriceLevel, 0, depth)

	for i, price := range ob.bidLevels {
		if i >= depth {
			break
		}
		if level, ok := ob.Bids[price.String()]; ok {
			bids = append(bids, PriceLevel{
				Price:    level.Price,
				Quantity: level.Quantity,
			})
		}
	}

	for i, price := range ob.askLevels {
		if i >= depth {
			break
		}
		if level, ok := ob.Asks[price.String()]; ok {
			asks = append(asks, PriceLevel{
				Price:    level.Price,
				Quantity: level.Quantity,
			})
		}
	}

	return bids, asks
}

// GetRecentTrades returns recent trades for a symbol
func (e *MatchingEngine) GetRecentTrades(symbol string, limit int) []*Trade {
	e.mu.RLock()
	defer e.mu.RUnlock()

	trades := e.trades[symbol]
	if len(trades) == 0 {
		return []*Trade{}
	}

	start := len(trades) - limit
	if start < 0 {
		start = 0
	}

	return trades[start:]
}

// GetStats returns engine statistics
func (e *MatchingEngine) GetStats() *EngineStats {
	e.stats.mu.Lock()
	defer e.stats.mu.Unlock()

	return &EngineStats{
		OrdersProcessed: e.stats.OrdersProcessed,
		TradesExecuted:  e.stats.TradesExecuted,
		OrdersCancelled: e.stats.OrdersCancelled,
		LastMatchTimeNs: e.stats.LastMatchTimeNs,
		StartedAt:       e.stats.StartedAt,
	}
}

// Helper functions
func insertPriceAsc(prices []decimal.Decimal, price decimal.Decimal) []decimal.Decimal {
	for i, p := range prices {
		if price.LessThan(p) {
			return append(prices[:i], append([]decimal.Decimal{price}, prices[i:]...)...)
		}
	}
	return append(prices, price)
}

func insertPriceDesc(prices []decimal.Decimal, price decimal.Decimal) []decimal.Decimal {
	for i, p := range prices {
		if price.GreaterThan(p) {
			return append(prices[:i], append([]decimal.Decimal{price}, prices[i:]...)...)
		}
	}
	return append(prices, price)
}

func removePrice(prices []decimal.Decimal, price decimal.Decimal) []decimal.Decimal {
	for i, p := range prices {
		if p.Equal(price) {
			return append(prices[:i], prices[i+1:]...)
		}
	}
	return prices
}

func removeOrder(orders []*Order, orderID string) []*Order {
	for i, o := range orders {
		if o.ID == orderID {
			return append(orders[:i], orders[i+1:]...)
		}
	}
	return orders
}
