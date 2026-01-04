package repository

import (
	"github.com/google/uuid"
	"github.com/trading-platform/matching-engine/internal/types"
)

type Repository interface {
	// Orders
	CreateOrder(order *types.Order) error
	UpdateOrder(order *types.Order) error
	GetOrder(orderID uuid.UUID) (*types.Order, error)
	GetUserOrders(userID uuid.UUID, status types.OrderStatus) ([]*types.Order, error)

	// Trades
	CreateTrade(trade *types.Trade) error
	GetTrades(tradingPair string, limit int) ([]*types.Trade, error)

	// Positions
	GetPosition(userID uuid.UUID, tradingPair string) (*types.Position, error)
	UpdatePosition(position *types.Position) error
	GetUserPositions(userID uuid.UUID) ([]*types.Position, error)

	// Liquidations
	CreateLiquidation(liquidation *types.Liquidation) error
	GetLiquidations(userID uuid.UUID) ([]*types.Liquidation, error)

	// Market Data
	GetTicker(tradingPair string) (*types.Ticker, error)
	GetTickers() ([]*types.Ticker, error)

	Close() error
}
