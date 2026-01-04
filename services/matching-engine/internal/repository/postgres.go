package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/trading-platform/matching-engine/internal/types"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(connectionString string) (*PostgresRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(100)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(time.Hour)

	return &PostgresRepository{db: db}, nil
}

func (r *PostgresRepository) CreateOrder(order *types.Order) error {
	query := `
		INSERT INTO orders (
			id, user_id, trading_pair, type, side, price, quantity,
			filled_quantity, remaining_quantity, status, time_in_force,
			trading_type, margin_mode, leverage, stop_price, trailing_delta,
			display_quantity, linked_order_id, position_id, reduce_only,
			post_only, maker_fee, taker_fee, created_at, updated_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
				  $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
	`

	_, err := r.db.Exec(query,
		order.ID, order.UserID, order.TradingPair, order.Type, order.Side,
		order.Price, order.Quantity, order.FilledQuantity, order.RemainingQuantity,
		order.Status, order.TimeInForce, order.TradingType, order.MarginMode,
		order.Leverage, order.StopPrice, order.TrailingDelta, order.DisplayQuantity,
		order.LinkedOrderID, order.PositionID, order.ReduceOnly, order.PostOnly,
		order.MakerFee, order.TakerFee, order.CreatedAt, order.UpdatedAt, order.ExpiresAt,
	)

	return err
}

func (r *PostgresRepository) UpdateOrder(order *types.Order) error {
	query := `
		UPDATE orders SET
			filled_quantity = $1,
			remaining_quantity = $2,
			status = $3,
			updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query,
		order.FilledQuantity,
		order.RemainingQuantity,
		order.Status,
		time.Now(),
		order.ID,
	)

	return err
}

func (r *PostgresRepository) GetOrder(id uuid.UUID) (*types.Order, error) {
	query := `
		SELECT id, user_id, trading_pair, type, side, price, quantity,
			   filled_quantity, remaining_quantity, status, time_in_force,
			   trading_type, margin_mode, leverage, stop_price, trailing_delta,
			   display_quantity, linked_order_id, position_id, reduce_only,
			   post_only, maker_fee, taker_fee, created_at, updated_at, expires_at
		FROM orders WHERE id = $1
	`

	order := &types.Order{}
	err := r.db.QueryRow(query, id).Scan(
		&order.ID, &order.UserID, &order.TradingPair, &order.Type, &order.Side,
		&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
		&order.Status, &order.TimeInForce, &order.TradingType, &order.MarginMode,
		&order.Leverage, &order.StopPrice, &order.TrailingDelta, &order.DisplayQuantity,
		&order.LinkedOrderID, &order.PositionID, &order.ReduceOnly, &order.PostOnly,
		&order.MakerFee, &order.TakerFee, &order.CreatedAt, &order.UpdatedAt, &order.ExpiresAt,
	)

	if err != nil {
		return nil, err
	}

	return order, nil
}

func (r *PostgresRepository) GetUserOrders(userID uuid.UUID, status types.OrderStatus) ([]*types.Order, error) {
	query := `
		SELECT id, user_id, trading_pair, type, side, price, quantity,
			   filled_quantity, remaining_quantity, status, time_in_force,
			   trading_type, created_at, updated_at
		FROM orders
		WHERE user_id = $1 AND status = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, userID, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []*types.Order{}
	for rows.Next() {
		order := &types.Order{}
		err := rows.Scan(
			&order.ID, &order.UserID, &order.TradingPair, &order.Type, &order.Side,
			&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
			&order.Status, &order.TimeInForce, &order.TradingType,
			&order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			continue
		}
		orders = append(orders, order)
	}

	return orders, nil
}

func (r *PostgresRepository) GetOpenOrders(tradingPair string) ([]*types.Order, error) {
	query := `
		SELECT id, user_id, trading_pair, type, side, price, quantity,
			   filled_quantity, remaining_quantity, status, time_in_force,
			   trading_type, created_at, updated_at
		FROM orders
		WHERE trading_pair = $1 AND status IN ('OPEN', 'PARTIALLY_FILLED')
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query, tradingPair)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []*types.Order{}
	for rows.Next() {
		order := &types.Order{}
		err := rows.Scan(
			&order.ID, &order.UserID, &order.TradingPair, &order.Type, &order.Side,
			&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
			&order.Status, &order.TimeInForce, &order.TradingType,
			&order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			continue
		}
		orders = append(orders, order)
	}

	return orders, nil
}

func (r *PostgresRepository) CreateTrade(trade *types.Trade) error {
	query := `
		INSERT INTO trades (
			id, trading_pair, buy_order_id, sell_order_id, buy_user_id,
			sell_user_id, price, quantity, buyer_fee, seller_fee,
			trading_type, is_maker, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.db.Exec(query,
		trade.ID, trade.TradingPair, trade.BuyOrderID, trade.SellOrderID,
		trade.BuyUserID, trade.SellUserID, trade.Price, trade.Quantity,
		trade.BuyerFee, trade.SellerFee, trade.TradingType, trade.IsMaker,
		trade.Timestamp,
	)

	return err
}

func (r *PostgresRepository) GetTrades(tradingPair string, limit int) ([]*types.Trade, error) {
	query := `
		SELECT id, trading_pair, buy_order_id, sell_order_id, buy_user_id,
			   sell_user_id, price, quantity, buyer_fee, seller_fee,
			   trading_type, is_maker, timestamp
		FROM trades
		WHERE trading_pair = $1
		ORDER BY timestamp DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, tradingPair, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	trades := []*types.Trade{}
	for rows.Next() {
		trade := &types.Trade{}
		err := rows.Scan(
			&trade.ID, &trade.TradingPair, &trade.BuyOrderID, &trade.SellOrderID,
			&trade.BuyUserID, &trade.SellUserID, &trade.Price, &trade.Quantity,
			&trade.BuyerFee, &trade.SellerFee, &trade.TradingType, &trade.IsMaker,
			&trade.Timestamp,
		)
		if err != nil {
			continue
		}
		trades = append(trades, trade)
	}

	return trades, nil
}

func (r *PostgresRepository) UpdatePosition(position *types.Position) error {
	query := `
		INSERT INTO user_positions (
			id, user_id, trading_pair, side, size, entry_price, mark_price,
			liquidation_price, leverage, margin, margin_mode, unrealized_pnl,
			realized_pnl, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (user_id, trading_pair) DO UPDATE SET
			side = $4,
			size = $5,
			entry_price = $6,
			mark_price = $7,
			liquidation_price = $8,
			leverage = $9,
			margin = $10,
			margin_mode = $11,
			unrealized_pnl = $12,
			realized_pnl = $13,
			updated_at = $15
	`

	_, err := r.db.Exec(query,
		position.ID, position.UserID, position.TradingPair, position.Side,
		position.Size, position.EntryPrice, position.MarkPrice, position.LiquidationPrice,
		position.Leverage, position.Margin, position.MarginMode, position.UnrealizedPnL,
		position.RealizedPnL, position.CreatedAt, position.UpdatedAt,
	)

	return err
}

func (r *PostgresRepository) GetPosition(userID uuid.UUID, tradingPair string) (*types.Position, error) {
	query := `
		SELECT id, user_id, trading_pair, side, size, entry_price, mark_price,
			   liquidation_price, leverage, margin, margin_mode, unrealized_pnl,
			   realized_pnl, created_at, updated_at
		FROM user_positions
		WHERE user_id = $1 AND trading_pair = $2
	`

	position := &types.Position{}
	err := r.db.QueryRow(query, userID, tradingPair).Scan(
		&position.ID, &position.UserID, &position.TradingPair, &position.Side,
		&position.Size, &position.EntryPrice, &position.MarkPrice, &position.LiquidationPrice,
		&position.Leverage, &position.Margin, &position.MarginMode, &position.UnrealizedPnL,
		&position.RealizedPnL, &position.CreatedAt, &position.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return position, nil
}

func (r *PostgresRepository) GetUserPositions(userID uuid.UUID) ([]*types.Position, error) {
	query := `
		SELECT id, user_id, trading_pair, side, size, entry_price, mark_price,
			   liquidation_price, leverage, margin, margin_mode, unrealized_pnl,
			   realized_pnl, created_at, updated_at
		FROM user_positions
		WHERE user_id = $1 AND size > 0
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	positions := []*types.Position{}
	for rows.Next() {
		position := &types.Position{}
		err := rows.Scan(
			&position.ID, &position.UserID, &position.TradingPair, &position.Side,
			&position.Size, &position.EntryPrice, &position.MarkPrice, &position.LiquidationPrice,
			&position.Leverage, &position.Margin, &position.MarginMode, &position.UnrealizedPnL,
			&position.RealizedPnL, &position.CreatedAt, &position.UpdatedAt,
		)
		if err != nil {
			continue
		}
		positions = append(positions, position)
	}

	return positions, nil
}

func (r *PostgresRepository) CreateLiquidation(liquidation *types.Liquidation) error {
	query := `
		INSERT INTO liquidations (
			id, position_id, user_id, trading_pair, side, size,
			liquidation_price, bankruptcy_price, insurance_fund_contribution, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(query,
		liquidation.ID, liquidation.PositionID, liquidation.UserID,
		liquidation.TradingPair, liquidation.Side, liquidation.Size,
		liquidation.LiquidationPrice, liquidation.Bankruptcy, liquidation.InsuranceFund,
		liquidation.Timestamp,
	)

	return err
}

func (r *PostgresRepository) GetLiquidations(userID uuid.UUID) ([]*types.Liquidation, error) {
	query := `
		SELECT id, position_id, user_id, trading_pair, side, size,
			   liquidation_price, bankruptcy_price, insurance_fund_contribution, timestamp
		FROM liquidations
		WHERE user_id = $1
		ORDER BY timestamp DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	liquidations := []*types.Liquidation{}
	for rows.Next() {
		liquidation := &types.Liquidation{}
		err := rows.Scan(
			&liquidation.ID, &liquidation.PositionID, &liquidation.UserID,
			&liquidation.TradingPair, &liquidation.Side, &liquidation.Size,
			&liquidation.LiquidationPrice, &liquidation.Bankruptcy, &liquidation.InsuranceFund,
			&liquidation.Timestamp,
		)
		if err != nil {
			continue
		}
		liquidations = append(liquidations, liquidation)
	}

	return liquidations, nil
}

func (r *PostgresRepository) GetTicker(tradingPair string) (*types.Ticker, error) {
	return nil, nil
}

func (r *PostgresRepository) GetTickers() ([]*types.Ticker, error) {
	return nil, nil
}

func (r *PostgresRepository) Close() error {
	return r.db.Close()
}
