package engine

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
	"github.com/trading-platform/matching-engine/internal/types"
	"go.uber.org/zap"
)

func (me *MatchingEngine) addStopOrder(order *types.Order) {
	order.Status = types.OrderStatusPending
	me.stopOrders[order.TradingPair] = append(me.stopOrders[order.TradingPair], order)
	me.repository.CreateOrder(order)
}

func (me *MatchingEngine) addTrailingStop(order *types.Order) {
	order.Status = types.OrderStatusPending
	
	orderBook := me.getOrCreateOrderBook(order.TradingPair)
	currentPrice := orderBook.GetMidPrice()
	
	tracker := &TrailingStopTracker{
		Order:        order,
		HighestPrice: currentPrice,
		LowestPrice:  currentPrice,
	}
	
	me.trailingStops[order.ID] = tracker
	me.repository.CreateOrder(order)
}

func (me *MatchingEngine) monitorStopOrders(ctx context.Context) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			me.checkStopOrders()
			me.checkTrailingStops()
		}
	}
}

func (me *MatchingEngine) checkStopOrders() {
	me.mu.Lock()
	defer me.mu.Unlock()

	for pair, orders := range me.stopOrders {
		orderBook := me.getOrCreateOrderBook(pair)
		currentPrice := orderBook.GetMidPrice()

		if currentPrice.IsZero() {
			continue
		}

		remainingOrders := []*types.Order{}

		for _, order := range orders {
			triggered := false

			if order.Side == types.OrderSideBuy && order.StopPrice != nil {
				// Buy stop: trigger when price goes above stop price
				triggered = currentPrice.GreaterThanOrEqual(*order.StopPrice)
			} else if order.Side == types.OrderSideSell && order.StopPrice != nil {
				// Sell stop: trigger when price goes below stop price
				triggered = currentPrice.LessThanOrEqual(*order.StopPrice)
			}

			if triggered {
				me.logger.Info("Stop order triggered",
					zap.String("order_id", order.ID.String()),
					zap.String("pair", pair),
					zap.String("stop_price", order.StopPrice.String()),
					zap.String("current_price", currentPrice.String()),
				)

				// Convert to market or limit order
				if order.Type == types.OrderTypeStopLoss {
					order.Type = types.OrderTypeMarket
					me.executeMarketOrder(order, orderBook)
				} else if order.Type == types.OrderTypeStopLimit {
					order.Type = types.OrderTypeLimit
					me.executeLimitOrder(order, orderBook)
				}
			} else {
				remainingOrders = append(remainingOrders, order)
			}
		}

		me.stopOrders[pair] = remainingOrders
	}
}

func (me *MatchingEngine) checkTrailingStops() {
	me.mu.Lock()
	defer me.mu.Unlock()

	for orderID, tracker := range me.trailingStops {
		order := tracker.Order
		orderBook := me.getOrCreateOrderBook(order.TradingPair)
		currentPrice := orderBook.GetMidPrice()

		if currentPrice.IsZero() {
			continue
		}

		triggered := false

		if order.Side == types.OrderSideBuy {
			// Track lowest price
			if currentPrice.LessThan(tracker.LowestPrice) {
				tracker.LowestPrice = currentPrice
			}

			// Trigger if price moves up by trailing delta from lowest
			if order.TrailingDelta != nil {
				triggerPrice := tracker.LowestPrice.Add(*order.TrailingDelta)
				triggered = currentPrice.GreaterThanOrEqual(triggerPrice)
			}
		} else {
			// Track highest price
			if currentPrice.GreaterThan(tracker.HighestPrice) {
				tracker.HighestPrice = currentPrice
			}

			// Trigger if price moves down by trailing delta from highest
			if order.TrailingDelta != nil {
				triggerPrice := tracker.HighestPrice.Sub(*order.TrailingDelta)
				triggered = currentPrice.LessThanOrEqual(triggerPrice)
			}
		}

		if triggered {
			me.logger.Info("Trailing stop triggered",
				zap.String("order_id", order.ID.String()),
				zap.String("pair", order.TradingPair),
				zap.String("current_price", currentPrice.String()),
			)

			order.Type = types.OrderTypeMarket
			me.executeMarketOrder(order, orderBook)
			delete(me.trailingStops, orderID)
		}
	}
}

func (me *MatchingEngine) monitorLiquidations(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			me.checkLiquidations()
		}
	}
}

func (me *MatchingEngine) checkLiquidations() {
	me.mu.Lock()
	defer me.mu.Unlock()

	for key, position := range me.positions {
		orderBook := me.getOrCreateOrderBook(position.TradingPair)
		markPrice := orderBook.GetMidPrice()

		if markPrice.IsZero() {
			continue
		}

		// Calculate liquidation price
		liquidationPrice := me.calculateLiquidationPrice(position)

		// Check if position should be liquidated
		shouldLiquidate := false
		if position.Side == types.OrderSideBuy {
			shouldLiquidate = markPrice.LessThanOrEqual(liquidationPrice)
		} else {
			shouldLiquidate = markPrice.GreaterThanOrEqual(liquidationPrice)
		}

		if shouldLiquidate {
			me.liquidatePosition(position, markPrice)
			delete(me.positions, key)
		} else {
			// Update unrealized PnL
			position.MarkPrice = markPrice
			position.UnrealizedPnL = me.calculateUnrealizedPnL(position, markPrice)
			me.repository.UpdatePosition(position)
		}
	}
}

func (me *MatchingEngine) calculateLiquidationPrice(position *types.Position) decimal.Decimal {
	// Simplified liquidation price calculation
	// liquidation_price = entry_price * (1 - margin_ratio)
	maintenanceMarginRate := decimal.NewFromFloat(0.005) // 0.5%
	
	if position.Side == types.OrderSideBuy {
		// Long position
		return position.EntryPrice.Mul(decimal.NewFromInt(1).Sub(maintenanceMarginRate.Mul(position.Leverage)))
	}
	// Short position
	return position.EntryPrice.Mul(decimal.NewFromInt(1).Add(maintenanceMarginRate.Mul(position.Leverage)))
}

func (me *MatchingEngine) calculateUnrealizedPnL(position *types.Position, markPrice decimal.Decimal) decimal.Decimal {
	priceDiff := decimal.Zero
	if position.Side == types.OrderSideBuy {
		priceDiff = markPrice.Sub(position.EntryPrice)
	} else {
		priceDiff = position.EntryPrice.Sub(markPrice)
	}
	return priceDiff.Mul(position.Size)
}
