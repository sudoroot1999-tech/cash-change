package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/trading-platform/matching-engine/internal/kafka"
	"github.com/trading-platform/matching-engine/internal/repository"
	"github.com/trading-platform/matching-engine/internal/types"
	"github.com/trading-platform/matching-engine/internal/websocket"
	"go.uber.org/zap"
)

type MatchingEngine struct {
	mu            sync.RWMutex
	orderBooks    map[string]*OrderBook
	stopOrders    map[string][]*types.Order
	trailingStops map[uuid.UUID]*TrailingStopTracker
	positions     map[string]*types.Position
	repository    repository.Repository
	kafkaProducer *kafka.Producer
	wsHub         *websocket.Hub
	logger        *zap.Logger
	orderQueue    chan *types.Order
	cancelQueue   chan uuid.UUID
	metrics       *Metrics
}

type TrailingStopTracker struct {
	Order        *types.Order
	HighestPrice decimal.Decimal
	LowestPrice  decimal.Decimal
}

type Metrics struct {
	OrdersProcessed   int64
	OrdersMatched     int64
	TradesExecuted    int64
	AverageLatency    time.Duration
	OrdersPerSecond   float64
	lastUpdate        time.Time
}

func NewMatchingEngine(
	repo repository.Repository,
	kafkaProducer *kafka.Producer,
	wsHub *websocket.Hub,
	logger *zap.Logger,
) *MatchingEngine {
	return &MatchingEngine{
		orderBooks:    make(map[string]*OrderBook),
		stopOrders:    make(map[string][]*types.Order),
		trailingStops: make(map[uuid.UUID]*TrailingStopTracker),
		positions:     make(map[string]*types.Position),
		repository:    repo,
		kafkaProducer: kafkaProducer,
		wsHub:         wsHub,
		logger:        logger,
		orderQueue:    make(chan *types.Order, 100000),
		cancelQueue:   make(chan uuid.UUID, 10000),
		metrics:       &Metrics{lastUpdate: time.Now()},
	}
}

func (me *MatchingEngine) Start(ctx context.Context) {
	me.logger.Info("Starting matching engine")

	// Start metrics reporter
	go me.reportMetrics(ctx)

	// Start multiple workers for parallel processing
	numWorkers := 10
	for i := 0; i < numWorkers; i++ {
		go me.processOrders(ctx)
	}

	// Process cancellations
	go me.processCancellations(ctx)

	<-ctx.Done()
	me.logger.Info("Matching engine stopped")
}

func (me *MatchingEngine) processOrders(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case order := <-me.orderQueue:
			startTime := time.Now()
			me.ProcessOrder(order)
			latency := time.Since(startTime)
			me.updateMetrics(latency)
		}
	}
}

func (me *MatchingEngine) processCancellations(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case orderID := <-me.cancelQueue:
			me.CancelOrder(orderID)
		}
	}
}

func (me *MatchingEngine) ProcessOrder(order *types.Order) error {
	me.mu.Lock()
	orderBook, exists := me.orderBooks[order.TradingPair]
	if !exists {
		orderBook = NewOrderBook(order.TradingPair)
		me.orderBooks[order.TradingPair] = orderBook
	}
	me.mu.Unlock()

	// Validate order
	if err := me.validateOrder(order); err != nil {
		order.Status = types.OrderStatusRejected
		me.repository.UpdateOrder(order)
		me.publishOrderEvent(order, "order.rejected")
		return err
	}

	// Handle different order types
	switch order.Type {
	case types.OrderTypeMarket:
		return me.processMarketOrder(order, orderBook)
	case types.OrderTypeLimit:
		return me.processLimitOrder(order, orderBook)
	case types.OrderTypeStopLoss, types.OrderTypeStopLimit:
		return me.processStopOrder(order, orderBook)
	case types.OrderTypeTrailingStop:
		return me.processTrailingStopOrder(order, orderBook)
	case types.OrderTypeIceberg:
		return me.processIcebergOrder(order, orderBook)
	default:
		return fmt.Errorf("unsupported order type: %s", order.Type)
	}
}

func (me *MatchingEngine) processMarketOrder(order *types.Order, ob *OrderBook) error {
	order.Status = types.OrderStatusOpen

	trades := me.matchOrder(order, ob)

	if order.RemainingQuantity.IsZero() {
		order.Status = types.OrderStatusFilled
	} else if order.FilledQuantity.IsPositive() {
		order.Status = types.OrderStatusPartiallyFilled
		
		// Market orders with IOC or FOK should be cancelled if not fully filled
		if order.TimeInForce == types.TimeInForceIOC || order.TimeInForce == types.TimeInForceFOK {
			order.Status = types.OrderStatusCancelled
		}
	} else {
		order.Status = types.OrderStatusCancelled
	}

	me.repository.UpdateOrder(order)
	me.publishOrderEvent(order, "order.processed")

	for _, trade := range trades {
		me.executeTrade(trade)
	}

	return nil
}

func (me *MatchingEngine) processLimitOrder(order *types.Order, ob *OrderBook) error {
	order.Status = types.OrderStatusOpen

	// Try to match immediately
	trades := me.matchOrder(order, ob)

	if order.RemainingQuantity.IsZero() {
		order.Status = types.OrderStatusFilled
	} else if order.FilledQuantity.IsPositive() {
		order.Status = types.OrderStatusPartiallyFilled
		
		// Handle time in force
		if order.TimeInForce == types.TimeInForceIOC || order.TimeInForce == types.TimeInForceFOK {
			order.Status = types.OrderStatusCancelled
		} else {
			// Add remaining to order book
			ob.AddOrder(order)
		}
	} else {
		// No match, add to order book
		ob.AddOrder(order)
	}

	me.repository.UpdateOrder(order)
	me.publishOrderEvent(order, "order.processed")

	for _, trade := range trades {
		me.executeTrade(trade)
	}

	// Broadcast order book update
	me.broadcastOrderBook(ob)

	return nil
}

func (me *MatchingEngine) processStopOrder(order *types.Order, ob *OrderBook) error {
	// Stop orders are stored separately and triggered when price reaches stop price
	order.Status = types.OrderStatusPending
	me.repository.CreateOrder(order)
	me.publishOrderEvent(order, "order.created")
	return nil
}

func (me *MatchingEngine) processTrailingStopOrder(order *types.Order, ob *OrderBook) error {
	// Trailing stop orders track the market price and adjust stop price
	order.Status = types.OrderStatusPending
	me.repository.CreateOrder(order)
	me.publishOrderEvent(order, "order.created")
	return nil
}

func (me *MatchingEngine) processIcebergOrder(order *types.Order, ob *OrderBook) error {
	// Iceberg orders display only a portion of the total quantity
	visibleOrder := *order
	if order.DisplayQuantity != nil && order.DisplayQuantity.LessThan(order.Quantity) {
		visibleOrder.Quantity = *order.DisplayQuantity
		visibleOrder.RemainingQuantity = *order.DisplayQuantity
	}

	return me.processLimitOrder(&visibleOrder, ob)
}

func (me *MatchingEngine) matchOrder(takerOrder *types.Order, ob *OrderBook) []*types.Trade {
	trades := []*types.Trade{}

	for takerOrder.RemainingQuantity.IsPositive() {
		var makerOrder *types.Order
		var matchPrice decimal.Decimal

		if takerOrder.Side == types.OrderSideBuy {
			bestAsk, hasAsk := ob.GetBestAsk()
			if !hasAsk || (takerOrder.Type == types.OrderTypeLimit && takerOrder.Price.LessThan(bestAsk.Price)) {
				break
			}
			matchPrice = bestAsk.Price
			makerOrder = bestAsk.Orders[0]
		} else {
			bestBid, hasBid := ob.GetBestBid()
			if !hasBid || (takerOrder.Type == types.OrderTypeLimit && takerOrder.Price.GreaterThan(bestBid.Price)) {
				break
			}
			matchPrice = bestBid.Price
			makerOrder = bestBid.Orders[0]
		}

		// Calculate trade quantity
		tradeQuantity := decimal.Min(takerOrder.RemainingQuantity, makerOrder.RemainingQuantity)

		// Update order quantities
		takerOrder.RemainingQuantity = takerOrder.RemainingQuantity.Sub(tradeQuantity)
		takerOrder.FilledQuantity = takerOrder.FilledQuantity.Add(tradeQuantity)
		makerOrder.RemainingQuantity = makerOrder.RemainingQuantity.Sub(tradeQuantity)
		makerOrder.FilledQuantity = makerOrder.FilledQuantity.Add(tradeQuantity)

		// Create trade
		trade := &types.Trade{
			ID:          uuid.New(),
			TradingPair: takerOrder.TradingPair,
			Price:       matchPrice,
			Quantity:    tradeQuantity,
			Timestamp:   time.Now(),
			TradingType: takerOrder.TradingType,
		}

		if takerOrder.Side == types.OrderSideBuy {
			trade.BuyOrderID = takerOrder.ID
			trade.SellOrderID = makerOrder.ID
			trade.BuyUserID = takerOrder.UserID
			trade.SellUserID = makerOrder.UserID
			trade.BuyerFee = tradeQuantity.Mul(matchPrice).Mul(takerOrder.TakerFee)
			trade.SellerFee = tradeQuantity.Mul(matchPrice).Mul(makerOrder.MakerFee)
		} else {
			trade.BuyOrderID = makerOrder.ID
			trade.SellOrderID = takerOrder.ID
			trade.BuyUserID = makerOrder.UserID
			trade.SellUserID = takerOrder.UserID
			trade.BuyerFee = tradeQuantity.Mul(matchPrice).Mul(makerOrder.MakerFee)
			trade.SellerFee = tradeQuantity.Mul(matchPrice).Mul(takerOrder.TakerFee)
		}

		trades = append(trades, trade)

		// Update maker order status
		if makerOrder.RemainingQuantity.IsZero() {
			makerOrder.Status = types.OrderStatusFilled
			ob.RemoveOrder(makerOrder.ID)
		} else {
			makerOrder.Status = types.OrderStatusPartiallyFilled
		}

		me.repository.UpdateOrder(makerOrder)
		me.publishOrderEvent(makerOrder, "order.matched")
	}

	return trades
}

func (me *MatchingEngine) executeTrade(trade *types.Trade) {
	// Save trade to database
	if err := me.repository.CreateTrade(trade); err != nil {
		me.logger.Error("Failed to create trade", zap.Error(err))
		return
	}

	// Update positions for futures trading
	if trade.TradingType == types.TradingTypeFutures {
		me.updatePositions(trade)
	}

	// Publish trade event
	me.publishTradeEvent(trade)

	// Broadcast trade to WebSocket clients
	me.wsHub.BroadcastTrade(trade)

	me.metrics.TradesExecuted++
}

func (me *MatchingEngine) updatePositions(trade *types.Trade) {
	// Update buyer position
	buyerPosition, _ := me.repository.GetPosition(trade.BuyUserID, trade.TradingPair)
	if buyerPosition != nil {
		me.updatePosition(buyerPosition, trade.Quantity, trade.Price, types.OrderSideBuy)
	}

	// Update seller position
	sellerPosition, _ := me.repository.GetPosition(trade.SellUserID, trade.TradingPair)
	if sellerPosition != nil {
		me.updatePosition(sellerPosition, trade.Quantity, trade.Price, types.OrderSideSell)
	}
}

func (me *MatchingEngine) updatePosition(position *types.Position, quantity, price decimal.Decimal, side types.OrderSide) {
	if position.Side == side {
		// Increase position
		totalValue := position.Size.Mul(position.EntryPrice).Add(quantity.Mul(price))
		position.Size = position.Size.Add(quantity)
		position.EntryPrice = totalValue.Div(position.Size)
	} else {
		// Reduce or reverse position
		if quantity.LessThan(position.Size) {
			// Reduce position
			pnl := position.Size.Sub(quantity).Mul(position.EntryPrice.Sub(price))
			position.RealizedPnL = position.RealizedPnL.Add(pnl)
			position.Size = position.Size.Sub(quantity)
		} else if quantity.Equal(position.Size) {
			// Close position
			pnl := position.Size.Mul(position.EntryPrice.Sub(price))
			position.RealizedPnL = position.RealizedPnL.Add(pnl)
			position.Size = decimal.Zero
		} else {
			// Reverse position
			pnl := position.Size.Mul(position.EntryPrice.Sub(price))
			position.RealizedPnL = position.RealizedPnL.Add(pnl)
			position.Size = quantity.Sub(position.Size)
			position.Side = side
			position.EntryPrice = price
		}
	}

	position.UpdatedAt = time.Now()
	me.repository.UpdatePosition(position)

	// Check for liquidation
	me.checkLiquidation(position)
}

func (me *MatchingEngine) checkLiquidation(position *types.Position) {
	// Calculate liquidation price
	maintenanceMargin := decimal.NewFromFloat(0.005) // 0.5%
	
	if position.Side == types.OrderSideBuy {
		position.LiquidationPrice = position.EntryPrice.Mul(
			decimal.NewFromInt(1).Sub(
				decimal.NewFromInt(1).Div(position.Leverage).Sub(maintenanceMargin),
			),
		)
	} else {
		position.LiquidationPrice = position.EntryPrice.Mul(
			decimal.NewFromInt(1).Add(
				decimal.NewFromInt(1).Div(position.Leverage).Sub(maintenanceMargin),
			),
		)
	}

	// Check if position should be liquidated
	shouldLiquidate := false
	if position.Side == types.OrderSideBuy && position.MarkPrice.LessThanOrEqual(position.LiquidationPrice) {
		shouldLiquidate = true
	} else if position.Side == types.OrderSideSell && position.MarkPrice.GreaterThanOrEqual(position.LiquidationPrice) {
		shouldLiquidate = true
	}

	if shouldLiquidate {
		me.liquidatePosition(position)
	}
}

func (me *MatchingEngine) liquidatePosition(position *types.Position, markPrice ...decimal.Decimal) {
	liquidationPrice := position.LiquidationPrice
	if len(markPrice) > 0 {
		liquidationPrice = markPrice[0]
	}
	
	liquidation := &types.Liquidation{
		ID:               uuid.New(),
		PositionID:       position.ID,
		UserID:           position.UserID,
		TradingPair:      position.TradingPair,
		Side:             position.Side,
		Size:             position.Size,
		LiquidationPrice: liquidationPrice,
		Timestamp:        time.Now(),
	}

	// Create liquidation order
	liquidationOrder := &types.Order{
		ID:                uuid.New(),
		UserID:            position.UserID,
		TradingPair:       position.TradingPair,
		Type:              types.OrderTypeMarket,
		Side:              getOppositeSide(position.Side),
		Quantity:          position.Size,
		RemainingQuantity: position.Size,
		Status:            types.OrderStatusOpen,
		TimeInForce:       types.TimeInForceIOC,
		TradingType:       types.TradingTypeFutures,
		ReduceOnly:        true,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	// Process liquidation order
	me.orderQueue <- liquidationOrder

	// Save liquidation
	me.repository.CreateLiquidation(liquidation)

	// Publish liquidation event
	me.publishLiquidationEvent(liquidation)

	me.logger.Info("Position liquidated",
		zap.String("position_id", position.ID.String()),
		zap.String("user_id", position.UserID.String()),
		zap.String("trading_pair", position.TradingPair),
	)
}

func (me *MatchingEngine) CancelOrder(orderID uuid.UUID) error {
	// Find order in all order books
	me.mu.RLock()
	var order *types.Order
	var orderBook *OrderBook

	for _, ob := range me.orderBooks {
		if o, exists := ob.Orders[orderID]; exists {
			order = o
			orderBook = ob
			break
		}
	}
	me.mu.RUnlock()

	if order == nil {
		return fmt.Errorf("order not found: %s", orderID)
	}

	// Remove from order book
	orderBook.RemoveOrder(orderID)

	// Update order status
	order.Status = types.OrderStatusCancelled
	order.UpdatedAt = time.Now()
	me.repository.UpdateOrder(order)

	// Publish cancel event
	me.publishOrderEvent(order, "order.cancelled")

	// Broadcast order book update
	me.broadcastOrderBook(orderBook)

	return nil
}

func (me *MatchingEngine) validateOrder(order *types.Order) error {
	// Basic validation
	if order.Quantity.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("invalid quantity")
	}

	if order.Type == types.OrderTypeLimit && order.Price.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("invalid price")
	}

	// Check position limits for futures
	if order.TradingType == types.TradingTypeFutures {
		position, _ := me.repository.GetPosition(order.UserID, order.TradingPair)
		if position != nil {
			// Check leverage limits
			maxLeverage := decimal.NewFromInt(125)
			if position.Leverage.GreaterThan(maxLeverage) {
				return fmt.Errorf("leverage exceeds maximum of 125x")
			}
		}
	}

	return nil
}

func (me *MatchingEngine) GetOrderBook(tradingPair string, depth int) *types.OrderBook {
	me.mu.RLock()
	ob, exists := me.orderBooks[tradingPair]
	me.mu.RUnlock()

	if !exists {
		return &types.OrderBook{
			TradingPair: tradingPair,
			Bids:        []types.OrderBookLevel{},
			Asks:        []types.OrderBookLevel{},
			Timestamp:   time.Now(),
		}
	}

	return ob.GetSnapshot(depth)
}

func (me *MatchingEngine) SubmitOrder(order *types.Order) {
	me.orderQueue <- order
}

func (me *MatchingEngine) SubmitCancellation(orderID uuid.UUID) {
	me.cancelQueue <- orderID
}

func (me *MatchingEngine) broadcastOrderBook(ob *OrderBook) {
	snapshot := ob.GetSnapshot(20)
	me.wsHub.BroadcastOrderBook(snapshot)
}

func (me *MatchingEngine) publishOrderEvent(order *types.Order, eventType string) {
	me.kafkaProducer.PublishOrderUpdate(order)
}

func (me *MatchingEngine) publishTradeEvent(trade *types.Trade) {
	me.kafkaProducer.PublishTrade(trade)
}

func (me *MatchingEngine) publishLiquidationEvent(liquidation *types.Liquidation) {
	me.kafkaProducer.PublishLiquidation(liquidation)
}

func (me *MatchingEngine) updateMetrics(latency time.Duration) {
	me.metrics.OrdersProcessed++
	me.metrics.AverageLatency = (me.metrics.AverageLatency + latency) / 2
}

func (me *MatchingEngine) reportMetrics(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			elapsed := time.Since(me.metrics.lastUpdate).Seconds()
			me.metrics.OrdersPerSecond = float64(me.metrics.OrdersProcessed) / elapsed

			me.logger.Info("Matching engine metrics",
				zap.Int64("orders_processed", me.metrics.OrdersProcessed),
				zap.Int64("orders_matched", me.metrics.OrdersMatched),
				zap.Int64("trades_executed", me.metrics.TradesExecuted),
				zap.Duration("avg_latency", me.metrics.AverageLatency),
				zap.Float64("orders_per_second", me.metrics.OrdersPerSecond),
			)

			me.metrics.lastUpdate = time.Now()
		}
	}
}

func (me *MatchingEngine) getOrCreateOrderBook(tradingPair string) *OrderBook {
	if ob, exists := me.orderBooks[tradingPair]; exists {
		return ob
	}
	ob := NewOrderBook(tradingPair)
	me.orderBooks[tradingPair] = ob
	return ob
}

func (me *MatchingEngine) executeMarketOrder(order *types.Order, ob *OrderBook) {
	me.processMarketOrder(order, ob)
}

func (me *MatchingEngine) executeLimitOrder(order *types.Order, ob *OrderBook) {
	me.processLimitOrder(order, ob)
}

func getOppositeSide(side types.OrderSide) types.OrderSide {
	if side == types.OrderSideBuy {
		return types.OrderSideSell
	}
	return types.OrderSideBuy
}
