package engine

import (
	"container/heap"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/trading-platform/matching-engine/internal/types"
)

// PriceLevel represents a price level in the order book
type PriceLevel struct {
	Price  decimal.Decimal
	Orders []*types.Order
	Total  decimal.Decimal
	index  int
}

// PriorityQueue implements heap.Interface for price-time priority
type PriorityQueue struct {
	items []*PriceLevel
	isBid bool
}

func (pq PriorityQueue) Len() int { return len(pq.items) }

func (pq PriorityQueue) Less(i, j int) bool {
	if pq.isBid {
		// Bids: highest price first
		return pq.items[i].Price.GreaterThan(pq.items[j].Price)
	}
	// Asks: lowest price first
	return pq.items[i].Price.LessThan(pq.items[j].Price)
}

func (pq PriorityQueue) Swap(i, j int) {
	pq.items[i], pq.items[j] = pq.items[j], pq.items[i]
	pq.items[i].index = i
	pq.items[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
	n := len(pq.items)
	item := x.(*PriceLevel)
	item.index = n
	pq.items = append(pq.items, item)
}

func (pq *PriorityQueue) Pop() interface{} {
	old := pq.items
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	pq.items = old[0 : n-1]
	return item
}

// OrderBook manages buy and sell orders for a trading pair
type OrderBook struct {
	TradingPair string
	Bids        *PriorityQueue
	Asks        *PriorityQueue
	Orders      map[uuid.UUID]*types.Order
	PriceLevels map[string]*PriceLevel // key: side+price
	mu          sync.RWMutex
	lastUpdate  time.Time
}

func NewOrderBook(tradingPair string) *OrderBook {
	bids := &PriorityQueue{isBid: true}
	asks := &PriorityQueue{isBid: false}
	heap.Init(bids)
	heap.Init(asks)

	return &OrderBook{
		TradingPair: tradingPair,
		Bids:        bids,
		Asks:        asks,
		Orders:      make(map[uuid.UUID]*types.Order),
		PriceLevels: make(map[string]*PriceLevel),
		lastUpdate:  time.Now(),
	}
}

func (ob *OrderBook) AddOrder(order *types.Order) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	ob.Orders[order.ID] = order
	
	key := ob.getPriceLevelKey(order.Side, order.Price)
	level, exists := ob.PriceLevels[key]
	
	if !exists {
		level = &PriceLevel{
			Price:  order.Price,
			Orders: []*types.Order{},
			Total:  decimal.Zero,
		}
		ob.PriceLevels[key] = level
		
		if order.Side == types.OrderSideBuy {
			heap.Push(ob.Bids, level)
		} else {
			heap.Push(ob.Asks, level)
		}
	}
	
	level.Orders = append(level.Orders, order)
	level.Total = level.Total.Add(order.RemainingQuantity)
	ob.lastUpdate = time.Now()
}

func (ob *OrderBook) RemoveOrder(orderID uuid.UUID) *types.Order {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	order, exists := ob.Orders[orderID]
	if !exists {
		return nil
	}

	delete(ob.Orders, orderID)
	
	key := ob.getPriceLevelKey(order.Side, order.Price)
	level := ob.PriceLevels[key]
	
	if level != nil {
		for i, o := range level.Orders {
			if o.ID == orderID {
				level.Orders = append(level.Orders[:i], level.Orders[i+1:]...)
				level.Total = level.Total.Sub(order.RemainingQuantity)
				break
			}
		}
		
		// Remove price level if empty
		if len(level.Orders) == 0 {
			delete(ob.PriceLevels, key)
			if order.Side == types.OrderSideBuy {
				ob.removePriceLevel(ob.Bids, level)
			} else {
				ob.removePriceLevel(ob.Asks, level)
			}
		}
	}
	
	ob.lastUpdate = time.Now()
	return order
}

func (ob *OrderBook) UpdateOrder(order *types.Order) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	existing, exists := ob.Orders[order.ID]
	if !exists {
		return
	}

	key := ob.getPriceLevelKey(order.Side, order.Price)
	level := ob.PriceLevels[key]
	
	if level != nil {
		for i, o := range level.Orders {
			if o.ID == order.ID {
				diff := order.RemainingQuantity.Sub(existing.RemainingQuantity)
				level.Total = level.Total.Add(diff)
				level.Orders[i] = order
				break
			}
		}
	}
	
	ob.Orders[order.ID] = order
	ob.lastUpdate = time.Now()
}

func (ob *OrderBook) GetBestBid() (*PriceLevel, bool) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Bids.Len() == 0 {
		return nil, false
	}
	return ob.Bids.items[0], true
}

func (ob *OrderBook) GetBestAsk() (*PriceLevel, bool) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Asks.Len() == 0 {
		return nil, false
	}
	return ob.Asks.items[0], true
}

func (ob *OrderBook) GetSpread() decimal.Decimal {
	bestBid, hasBid := ob.GetBestBid()
	bestAsk, hasAsk := ob.GetBestAsk()
	
	if !hasBid || !hasAsk {
		return decimal.Zero
	}
	
	return bestAsk.Price.Sub(bestBid.Price)
}

func (ob *OrderBook) GetMidPrice() decimal.Decimal {
	bestBid, hasBid := ob.GetBestBid()
	bestAsk, hasAsk := ob.GetBestAsk()
	
	if !hasBid || !hasAsk {
		return decimal.Zero
	}
	
	return bestBid.Price.Add(bestAsk.Price).Div(decimal.NewFromInt(2))
}

func (ob *OrderBook) GetSnapshot(depth int) *types.OrderBook {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	snapshot := &types.OrderBook{
		TradingPair: ob.TradingPair,
		Bids:        []types.OrderBookLevel{},
		Asks:        []types.OrderBookLevel{},
		Timestamp:   time.Now(),
	}

	// Get bids
	count := 0
	for _, level := range ob.Bids.items {
		if count >= depth {
			break
		}
		snapshot.Bids = append(snapshot.Bids, types.OrderBookLevel{
			Price:    level.Price,
			Quantity: level.Total,
			Orders:   len(level.Orders),
		})
		count++
	}

	// Get asks
	count = 0
	for _, level := range ob.Asks.items {
		if count >= depth {
			break
		}
		snapshot.Asks = append(snapshot.Asks, types.OrderBookLevel{
			Price:    level.Price,
			Quantity: level.Total,
			Orders:   len(level.Orders),
		})
		count++
	}

	return snapshot
}

func (ob *OrderBook) getPriceLevelKey(side types.OrderSide, price decimal.Decimal) string {
	return string(side) + ":" + price.String()
}

func (ob *OrderBook) removePriceLevel(pq *PriorityQueue, level *PriceLevel) {
	if level.index >= 0 && level.index < len(pq.items) {
		heap.Remove(pq, level.index)
	}
}

func (ob *OrderBook) GetOrderCount() int {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	return len(ob.Orders)
}

func (ob *OrderBook) GetTotalVolume() (bidVolume, askVolume decimal.Decimal) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	bidVolume = decimal.Zero
	askVolume = decimal.Zero

	for _, level := range ob.Bids.items {
		bidVolume = bidVolume.Add(level.Total)
	}

	for _, level := range ob.Asks.items {
		askVolume = askVolume.Add(level.Total)
	}

	return bidVolume, askVolume
}
