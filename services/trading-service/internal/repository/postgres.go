package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/shopspring/decimal"
	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
)

// PostgresRepository implements the Repository interface
type PostgresRepository struct {
	db     *sql.DB
	logger *zap.Logger
}

// NewPostgresRepository creates a new PostgreSQL repository
func NewPostgresRepository(databaseURL string, logger *zap.Logger) (*PostgresRepository, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("✅ Connected to PostgreSQL")

	return &PostgresRepository{db: db, logger: logger}, nil
}

// CreateOrder creates a new order
func (r *PostgresRepository) CreateOrder(ctx context.Context, order *types.Order) error {
	query := `
		INSERT INTO orders (
			id, user_id, trading_pair, type, side, price, quantity, 
			filled_quantity, remaining_quantity, status, time_in_force,
			trading_type, margin_mode, leverage, stop_price, display_quantity,
			maker_fee, taker_fee, reduce_only, post_only, linked_order_id,
			client_order_id, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
	`

	_, err := r.db.ExecContext(ctx, query,
		order.ID, order.UserID, order.TradingPair, order.Type, order.Side,
		order.Price, order.Quantity, order.FilledQuantity, order.RemainingQuantity,
		order.Status, order.TimeInForce, order.TradingType, order.MarginMode,
		order.Leverage, order.StopPrice, order.DisplayQuantity, order.MakerFee,
		order.TakerFee, order.ReduceOnly, order.PostOnly, order.LinkedOrderID,
		order.ClientOrderID, order.CreatedAt, order.UpdatedAt,
	)
	return err
}

// UpdateOrder updates an existing order
func (r *PostgresRepository) UpdateOrder(ctx context.Context, order *types.Order) error {
	query := `
		UPDATE orders SET
			filled_quantity = $1, remaining_quantity = $2, status = $3, updated_at = $4
		WHERE id = $5
	`
	_, err := r.db.ExecContext(ctx, query,
		order.FilledQuantity, order.RemainingQuantity, order.Status, time.Now(), order.ID,
	)
	return err
}

// GetOrder retrieves an order by ID
func (r *PostgresRepository) GetOrder(ctx context.Context, orderID uuid.UUID) (*types.Order, error) {
	query := `
		SELECT id, user_id, trading_pair, type, side, price, quantity,
			filled_quantity, remaining_quantity, status, time_in_force,
			trading_type, margin_mode, leverage, stop_price, display_quantity,
			maker_fee, taker_fee, reduce_only, post_only, linked_order_id,
			client_order_id, created_at, updated_at
		FROM orders WHERE id = $1
	`

	order := &types.Order{}
	var marginMode, linkedOrderID, displayQuantity sql.NullString
	var leverage, stopPrice sql.NullString

	err := r.db.QueryRowContext(ctx, query, orderID).Scan(
		&order.ID, &order.UserID, &order.TradingPair, &order.Type, &order.Side,
		&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
		&order.Status, &order.TimeInForce, &order.TradingType, &marginMode,
		&leverage, &stopPrice, &displayQuantity, &order.MakerFee, &order.TakerFee,
		&order.ReduceOnly, &order.PostOnly, &linkedOrderID, &order.ClientOrderID,
		&order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if marginMode.Valid {
		order.MarginMode = types.MarginMode(marginMode.String)
	}
	if leverage.Valid {
		order.Leverage, _ = decimal.NewFromString(leverage.String)
	}
	if stopPrice.Valid {
		order.StopPrice, _ = decimal.NewFromString(stopPrice.String)
	}

	return order, nil
}

// GetOpenOrders retrieves open orders for a user
func (r *PostgresRepository) GetOpenOrders(ctx context.Context, userID uuid.UUID, tradingPair string) ([]*types.Order, error) {
	query := `
		SELECT id, user_id, trading_pair, type, side, price, quantity,
			filled_quantity, remaining_quantity, status, time_in_force,
			trading_type, created_at, updated_at
		FROM orders 
		WHERE user_id = $1 AND status IN ('OPEN', 'PARTIALLY_FILLED')
	`
	args := []interface{}{userID}

	if tradingPair != "" {
		query += " AND trading_pair = $2"
		args = append(args, tradingPair)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*types.Order
	for rows.Next() {
		order := &types.Order{}
		err := rows.Scan(
			&order.ID, &order.UserID, &order.TradingPair, &order.Type, &order.Side,
			&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
			&order.Status, &order.TimeInForce, &order.TradingType, &order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}

	return orders, nil
}

// CreateTrade creates a new trade
func (r *PostgresRepository) CreateTrade(ctx context.Context, trade *types.Trade) error {
	query := `
		INSERT INTO trades (
			id, buy_order_id, sell_order_id, buy_user_id, sell_user_id,
			trading_pair, price, quantity, buyer_fee, seller_fee, trading_type, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.ExecContext(ctx, query,
		trade.ID, trade.BuyOrderID, trade.SellOrderID, trade.BuyUserID, trade.SellUserID,
		trade.TradingPair, trade.Price, trade.Quantity, trade.BuyerFee, trade.SellerFee,
		trade.TradingType, trade.Timestamp,
	)
	return err
}

// GetTrades retrieves trades for a trading pair
func (r *PostgresRepository) GetTrades(ctx context.Context, tradingPair string, limit int) ([]*types.Trade, error) {
	query := `
		SELECT id, buy_order_id, sell_order_id, buy_user_id, sell_user_id,
			trading_pair, price, quantity, buyer_fee, seller_fee, trading_type, timestamp
		FROM trades WHERE trading_pair = $1
		ORDER BY timestamp DESC LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, tradingPair, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*types.Trade
	for rows.Next() {
		trade := &types.Trade{}
		err := rows.Scan(
			&trade.ID, &trade.BuyOrderID, &trade.SellOrderID, &trade.BuyUserID, &trade.SellUserID,
			&trade.TradingPair, &trade.Price, &trade.Quantity, &trade.BuyerFee, &trade.SellerFee,
			&trade.TradingType, &trade.Timestamp,
		)
		if err != nil {
			return nil, err
		}
		trades = append(trades, trade)
	}

	return trades, nil
}

// CreatePosition creates a new position
func (r *PostgresRepository) CreatePosition(ctx context.Context, position *types.Position) error {
	query := `
		INSERT INTO positions (
			id, user_id, trading_pair, side, size, entry_price, mark_price,
			liquidation_price, leverage, margin_mode, margin, unrealized_pnl,
			realized_pnl, trading_type, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.db.ExecContext(ctx, query,
		position.ID, position.UserID, position.TradingPair, position.Side, position.Size,
		position.EntryPrice, position.MarkPrice, position.LiquidationPrice, position.Leverage,
		position.MarginMode, position.Margin, position.UnrealizedPnL, position.RealizedPnL,
		position.TradingType, position.CreatedAt, position.UpdatedAt,
	)
	return err
}

// UpdatePosition updates an existing position
func (r *PostgresRepository) UpdatePosition(ctx context.Context, position *types.Position) error {
	query := `
		UPDATE positions SET
			size = $1, entry_price = $2, mark_price = $3, liquidation_price = $4,
			margin = $5, unrealized_pnl = $6, realized_pnl = $7, updated_at = $8
		WHERE id = $9
	`
	_, err := r.db.ExecContext(ctx, query,
		position.Size, position.EntryPrice, position.MarkPrice, position.LiquidationPrice,
		position.Margin, position.UnrealizedPnL, position.RealizedPnL, time.Now(), position.ID,
	)
	return err
}

// GetPosition retrieves a position
func (r *PostgresRepository) GetPosition(ctx context.Context, userID uuid.UUID, tradingPair string) (*types.Position, error) {
	query := `
		SELECT id, user_id, trading_pair, side, size, entry_price, mark_price,
			liquidation_price, leverage, margin_mode, margin, unrealized_pnl,
			realized_pnl, trading_type, created_at, updated_at
		FROM positions WHERE user_id = $1 AND trading_pair = $2
	`

	position := &types.Position{}
	err := r.db.QueryRowContext(ctx, query, userID, tradingPair).Scan(
		&position.ID, &position.UserID, &position.TradingPair, &position.Side, &position.Size,
		&position.EntryPrice, &position.MarkPrice, &position.LiquidationPrice, &position.Leverage,
		&position.MarginMode, &position.Margin, &position.UnrealizedPnL, &position.RealizedPnL,
		&position.TradingType, &position.CreatedAt, &position.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return position, nil
}

// GetUserPositions retrieves all positions for a user
func (r *PostgresRepository) GetUserPositions(ctx context.Context, userID uuid.UUID) ([]*types.Position, error) {
	query := `
		SELECT id, user_id, trading_pair, side, size, entry_price, mark_price,
			liquidation_price, leverage, margin_mode, margin, unrealized_pnl,
			realized_pnl, trading_type, created_at, updated_at
		FROM positions WHERE user_id = $1 AND size > 0
		ORDER BY updated_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []*types.Position
	for rows.Next() {
		position := &types.Position{}
		err := rows.Scan(
			&position.ID, &position.UserID, &position.TradingPair, &position.Side, &position.Size,
			&position.EntryPrice, &position.MarkPrice, &position.LiquidationPrice, &position.Leverage,
			&position.MarginMode, &position.Margin, &position.UnrealizedPnL, &position.RealizedPnL,
			&position.TradingType, &position.CreatedAt, &position.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		positions = append(positions, position)
	}

	return positions, nil
}

// GetTradingPair retrieves a trading pair configuration
func (r *PostgresRepository) GetTradingPair(ctx context.Context, symbol string) (*types.TradingPair, error) {
	query := `
		SELECT symbol, base_asset, quote_asset, min_order_size, max_order_size,
			price_precision, quantity_precision, maker_fee, taker_fee, status
		FROM trading_pairs WHERE symbol = $1
	`

	pair := &types.TradingPair{}
	err := r.db.QueryRowContext(ctx, query, symbol).Scan(
		&pair.Symbol, &pair.BaseAsset, &pair.QuoteAsset, &pair.MinOrderSize, &pair.MaxOrderSize,
		&pair.PricePrecision, &pair.QuantityPrecision, &pair.MakerFee, &pair.TakerFee, &pair.Status,
	)
	if err != nil {
		return nil, err
	}

	return pair, nil
}

// Close closes the database connection
func (r *PostgresRepository) Close() error {
	return r.db.Close()
}
