package engine

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

func setupTestEngine(t *testing.T) *MatchingEngine {
	logger, _ := zap.NewDevelopment()
	return NewMatchingEngine(logger)
}

func createTestOrder(id string, side OrderSide, orderType OrderType, price, quantity string) *Order {
	p, _ := decimal.NewFromString(price)
	q, _ := decimal.NewFromString(quantity)
	return &Order{
		ID:            id,
		UserID:        "user-" + id,
		Symbol:        "BTCUSDT",
		Side:          side,
		Type:          orderType,
		Price:         p,
		Quantity:      q,
		FilledQty:     decimal.Zero,
		Status:        Pending,
		TimeInForce:   "GTC",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// TestNewMatchingEngine tests engine creation
func TestNewMatchingEngine(t *testing.T) {
	engine := setupTestEngine(t)
	
	if engine == nil {
		t.Fatal("Expected engine to be created")
	}
	
	stats := engine.GetStats()
	if stats.OrdersProcessed != 0 {
		t.Errorf("Expected 0 orders processed, got %d", stats.OrdersProcessed)
	}
}

// TestGetOrCreateOrderBook tests order book creation
func TestGetOrCreateOrderBook(t *testing.T) {
	engine := setupTestEngine(t)
	
	ob := engine.GetOrCreateOrderBook("BTCUSDT")
	if ob == nil {
		t.Fatal("Expected order book to be created")
	}
	
	if ob.Symbol != "BTCUSDT" {
		t.Errorf("Expected symbol BTCUSDT, got %s", ob.Symbol)
	}
	
	// Getting same symbol should return same order book
	ob2 := engine.GetOrCreateOrderBook("BTCUSDT")
	if ob != ob2 {
		t.Error("Expected same order book instance")
	}
}

// TestSubmitLimitOrder tests submitting a limit order
func TestSubmitLimitOrder(t *testing.T) {
	engine := setupTestEngine(t)
	
	order := createTestOrder("1", Buy, Limit, "45000", "0.5")
	trades, err := engine.SubmitOrder(order)
	
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	
	if len(trades) != 0 {
		t.Errorf("Expected 0 trades for unmatched order, got %d", len(trades))
	}
	
	if order.Status != Open {
		t.Errorf("Expected status Open, got %s", order.Status)
	}
}

// TestSubmitMarketOrderNoLiquidity tests market order with no liquidity
func TestSubmitMarketOrderNoLiquidity(t *testing.T) {
	engine := setupTestEngine(t)
	
	order := createTestOrder("1", Buy, Market, "0", "0.5")
	trades, err := engine.SubmitOrder(order)
	
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	
	// Market order with no liquidity should not match
	if len(trades) != 0 {
		t.Errorf("Expected 0 trades, got %d", len(trades))
	}
}

// TestLimitOrderMatching tests matching two limit orders
func TestLimitOrderMatching(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Submit sell order at 45000
	sellOrder := createTestOrder("1", Sell, Limit, "45000", "0.5")
	engine.SubmitOrder(sellOrder)
	
	// Submit buy order at 45000 - should match
	buyOrder := createTestOrder("2", Buy, Limit, "45000", "0.3")
	trades, err := engine.SubmitOrder(buyOrder)
	
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	
	if len(trades) != 1 {
		t.Fatalf("Expected 1 trade, got %d", len(trades))
	}
	
	trade := trades[0]
	expectedQty := decimal.NewFromFloat(0.3)
	if !trade.Quantity.Equal(expectedQty) {
		t.Errorf("Expected trade quantity %s, got %s", expectedQty, trade.Quantity)
	}
	
	expectedPrice := decimal.NewFromFloat(45000)
	if !trade.Price.Equal(expectedPrice) {
		t.Errorf("Expected trade price %s, got %s", expectedPrice, trade.Price)
	}
}

// TestPartialFill tests partial order fill
func TestPartialFill(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Submit sell order for 0.5 BTC
	sellOrder := createTestOrder("1", Sell, Limit, "45000", "0.5")
	engine.SubmitOrder(sellOrder)
	
	// Submit buy order for 0.3 BTC - partial fill
	buyOrder := createTestOrder("2", Buy, Limit, "45000", "0.3")
	trades, _ := engine.SubmitOrder(buyOrder)
	
	if len(trades) != 1 {
		t.Fatalf("Expected 1 trade, got %d", len(trades))
	}
	
	// Sell order should be partially filled
	remainingQty := decimal.NewFromFloat(0.2)
	if !sellOrder.Quantity.Sub(sellOrder.FilledQty).Equal(remainingQty) {
		t.Errorf("Expected remaining quantity %s, got %s", remainingQty, sellOrder.Quantity.Sub(sellOrder.FilledQty))
	}
	
	// Buy order should be fully filled
	if buyOrder.Status != Filled {
		t.Errorf("Expected buy order status Filled, got %s", buyOrder.Status)
	}
}

// TestMarketOrderFill tests market order filled against limit orders
func TestMarketOrderFill(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Place limit sell orders at different prices
	sell1 := createTestOrder("1", Sell, Limit, "45000", "0.2")
	sell2 := createTestOrder("2", Sell, Limit, "45100", "0.3")
	engine.SubmitOrder(sell1)
	engine.SubmitOrder(sell2)
	
	// Market buy should consume best ask first
	buyOrder := createTestOrder("3", Buy, Market, "0", "0.3")
	trades, _ := engine.SubmitOrder(buyOrder)
	
	if len(trades) < 1 {
		t.Fatalf("Expected at least 1 trade, got %d", len(trades))
	}
	
	// First trade should be at 45000 (best ask)
	firstTradePrice := decimal.NewFromFloat(45000)
	if !trades[0].Price.Equal(firstTradePrice) {
		t.Errorf("Expected first trade at best ask %s, got %s", firstTradePrice, trades[0].Price)
	}
}

// TestCancelOrder tests order cancellation
func TestCancelOrder(t *testing.T) {
	engine := setupTestEngine(t)
	
	order := createTestOrder("1", Buy, Limit, "45000", "0.5")
	engine.SubmitOrder(order)
	
	err := engine.CancelOrder("BTCUSDT", "1")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	
	// Order should be cancelled
	// Verify by trying to cancel again - should fail
	err = engine.CancelOrder("BTCUSDT", "1")
	if err == nil {
		t.Error("Expected error when cancelling non-existent order")
	}
}

// TestPricePriority tests price-time priority
func TestPricePriority(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Submit sell orders at different prices
	sell1 := createTestOrder("1", Sell, Limit, "45100", "0.1")
	sell2 := createTestOrder("2", Sell, Limit, "45000", "0.1") // Better price
	engine.SubmitOrder(sell1)
	engine.SubmitOrder(sell2)
	
	// Buy order should match with best price first (45000)
	buyOrder := createTestOrder("3", Buy, Limit, "45100", "0.1")
	trades, _ := engine.SubmitOrder(buyOrder)
	
	if len(trades) != 1 {
		t.Fatalf("Expected 1 trade, got %d", len(trades))
	}
	
	// Should match at the better price (45000)
	expectedPrice := decimal.NewFromFloat(45000)
	if !trades[0].Price.Equal(expectedPrice) {
		t.Errorf("Expected trade at best price %s, got %s", expectedPrice, trades[0].Price)
	}
}

// TestGetOrderBook tests order book retrieval
func TestGetOrderBook(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Add some orders
	buy1 := createTestOrder("1", Buy, Limit, "44900", "0.1")
	buy2 := createTestOrder("2", Buy, Limit, "44800", "0.2")
	sell1 := createTestOrder("3", Sell, Limit, "45100", "0.1")
	sell2 := createTestOrder("4", Sell, Limit, "45200", "0.2")
	
	engine.SubmitOrder(buy1)
	engine.SubmitOrder(buy2)
	engine.SubmitOrder(sell1)
	engine.SubmitOrder(sell2)
	
	bids, asks := engine.GetOrderBook("BTCUSDT", 10)
	
	if len(bids) != 2 {
		t.Errorf("Expected 2 bid levels, got %d", len(bids))
	}
	
	if len(asks) != 2 {
		t.Errorf("Expected 2 ask levels, got %d", len(asks))
	}
}

// TestEngineStats tests statistics tracking
func TestEngineStats(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Submit and match orders
	sell := createTestOrder("1", Sell, Limit, "45000", "0.1")
	buy := createTestOrder("2", Buy, Limit, "45000", "0.1")
	
	engine.SubmitOrder(sell)
	engine.SubmitOrder(buy)
	
	stats := engine.GetStats()
	
	if stats.OrdersProcessed != 2 {
		t.Errorf("Expected 2 orders processed, got %d", stats.OrdersProcessed)
	}
	
	if stats.TradesExecuted != 1 {
		t.Errorf("Expected 1 trade executed, got %d", stats.TradesExecuted)
	}
}

// TestTradeHandler tests trade callback
func TestTradeHandler(t *testing.T) {
	engine := setupTestEngine(t)
	
	tradeCount := 0
	engine.SetTradeHandler(func(trade *Trade) {
		tradeCount++
	})
	
	sell := createTestOrder("1", Sell, Limit, "45000", "0.1")
	buy := createTestOrder("2", Buy, Limit, "45000", "0.1")
	
	engine.SubmitOrder(sell)
	engine.SubmitOrder(buy)
	
	if tradeCount != 1 {
		t.Errorf("Expected trade handler called 1 time, got %d", tradeCount)
	}
}

// TestMultipleMatches tests order matching multiple orders
func TestMultipleMatches(t *testing.T) {
	engine := setupTestEngine(t)
	
	// Submit multiple small sell orders
	for i := 1; i <= 3; i++ {
		order := createTestOrder(string(rune('0'+i)), Sell, Limit, "45000", "0.1")
		order.ID = string(rune('0' + i))
		engine.SubmitOrder(order)
	}
	
	// Large buy order should match all
	buyOrder := createTestOrder("10", Buy, Limit, "45000", "0.3")
	trades, _ := engine.SubmitOrder(buyOrder)
	
	if len(trades) != 3 {
		t.Errorf("Expected 3 trades, got %d", len(trades))
	}
	
	if buyOrder.Status != Filled {
		t.Errorf("Expected buy order fully filled, got status %s", buyOrder.Status)
	}
}

// Benchmark tests
func BenchmarkSubmitLimitOrder(b *testing.B) {
	logger, _ := zap.NewProduction()
	engine := NewMatchingEngine(logger)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		order := &Order{
			ID:        string(rune(i)),
			UserID:    "user-1",
			Symbol:    "BTCUSDT",
			Side:      Buy,
			Type:      Limit,
			Price:     decimal.NewFromFloat(45000),
			Quantity:  decimal.NewFromFloat(0.1),
			FilledQty: decimal.Zero,
			Status:    Pending,
		}
		engine.SubmitOrder(order)
	}
}

func BenchmarkMatchOrders(b *testing.B) {
	logger, _ := zap.NewProduction()
	engine := NewMatchingEngine(logger)
	
	// Pre-populate with sell orders
	for i := 0; i < 1000; i++ {
		order := &Order{
			ID:        string(rune(i)),
			UserID:    "seller",
			Symbol:    "BTCUSDT",
			Side:      Sell,
			Type:      Limit,
			Price:     decimal.NewFromFloat(45000),
			Quantity:  decimal.NewFromFloat(0.1),
			FilledQty: decimal.Zero,
			Status:    Pending,
		}
		engine.SubmitOrder(order)
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		order := &Order{
			ID:        string(rune(1000 + i)),
			UserID:    "buyer",
			Symbol:    "BTCUSDT",
			Side:      Buy,
			Type:      Limit,
			Price:     decimal.NewFromFloat(45000),
			Quantity:  decimal.NewFromFloat(0.01),
			FilledQty: decimal.Zero,
			Status:    Pending,
		}
		engine.SubmitOrder(order)
	}
}
