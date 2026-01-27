package grpc

import (
	"context"
	"net"

	"github.com/google/uuid"
	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// TradingServiceInterface defines the interface for trading operations
// This breaks the import cycle between grpc and services packages
type TradingServiceInterface interface {
	CreateOrder(ctx context.Context, req *CreateOrderReq) (*types.Order, error)
	CancelOrder(ctx context.Context, orderID uuid.UUID) error
	GetOpenOrders(ctx context.Context, userID uuid.UUID, tradingPair string) ([]*types.Order, error)
	GetTicker(ctx context.Context, tradingPair string) (*types.Ticker, error)
	GetOrderBook(ctx context.Context, tradingPair string, depth int) (*types.OrderBook, error)
	GetPosition(ctx context.Context, userID uuid.UUID, tradingPair string) (*types.Position, error)
	GetUserPositions(ctx context.Context, userID uuid.UUID) ([]*types.Position, error)
}

// CreateOrderReq represents a request to create an order (defined here to avoid import cycle)
type CreateOrderReq struct {
	UserID        uuid.UUID
	TradingPair   string
	Type          string
	Side          string
	Price         string
	Quantity      string
	StopPrice     string
	TimeInForce   string
	TradingType   string
	MarginMode    string
	Leverage      string
	ReduceOnly    bool
	PostOnly      bool
	ClientOrderID string
}

// Server implements the gRPC trading service
type Server struct {
	tradingService TradingServiceInterface
	grpcServer     *grpc.Server
	logger         *zap.Logger
}

// NewServer creates a new gRPC server
func NewServer(tradingService TradingServiceInterface, logger *zap.Logger) *Server {
	return &Server{
		tradingService: tradingService,
		grpcServer:     grpc.NewServer(),
		logger:         logger,
	}
}

// Start starts the gRPC server
func (s *Server) Start(port string) error {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return err
	}

	// Register reflection for debugging
	reflection.Register(s.grpcServer)

	s.logger.Info("Starting gRPC server", zap.String("port", port))
	return s.grpcServer.Serve(lis)
}

// Stop stops the gRPC server
func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

// CreateOrder implements the CreateOrder RPC
func (s *Server) CreateOrder(ctx context.Context, req *CreateOrderRequest) (*Order, error) {
	userID, _ := uuid.Parse(req.UserId)

	orderReq := &CreateOrderReq{
		UserID:        userID,
		TradingPair:   req.TradingPair,
		Type:          req.Type,
		Side:          req.Side,
		Price:         req.Price,
		Quantity:      req.Quantity,
		StopPrice:     req.StopPrice,
		TimeInForce:   req.TimeInForce,
		TradingType:   req.TradingType,
		MarginMode:    req.MarginMode,
		Leverage:      req.Leverage,
		ReduceOnly:    req.ReduceOnly,
		PostOnly:      req.PostOnly,
		ClientOrderID: req.ClientOrderId,
	}

	order, err := s.tradingService.CreateOrder(ctx, orderReq)
	if err != nil {
		return nil, err
	}

	return &Order{
		Id:                order.ID.String(),
		UserId:            order.UserID.String(),
		TradingPair:       order.TradingPair,
		Type:              string(order.Type),
		Side:              string(order.Side),
		Price:             order.Price.String(),
		Quantity:          order.Quantity.String(),
		FilledQuantity:    order.FilledQuantity.String(),
		RemainingQuantity: order.RemainingQuantity.String(),
		Status:            string(order.Status),
	}, nil
}

// CancelOrder implements the CancelOrder RPC
func (s *Server) CancelOrder(ctx context.Context, req *CancelOrderRequest) (*CancelOrderResponse, error) {
	orderID, err := uuid.Parse(req.OrderId)
	if err != nil {
		return &CancelOrderResponse{Success: false, Message: "Invalid order ID"}, nil
	}

	if err := s.tradingService.CancelOrder(ctx, orderID); err != nil {
		return &CancelOrderResponse{Success: false, Message: err.Error()}, nil
	}

	return &CancelOrderResponse{Success: true, Message: "Order cancelled"}, nil
}

// GetOpenOrders implements the GetOpenOrders RPC
func (s *Server) GetOpenOrders(ctx context.Context, req *GetOpenOrdersRequest) (*OrderList, error) {
	userID, _ := uuid.Parse(req.UserId)

	orders, err := s.tradingService.GetOpenOrders(ctx, userID, req.TradingPair)
	if err != nil {
		return nil, err
	}

	result := &OrderList{Orders: make([]*Order, len(orders))}
	for i, o := range orders {
		result.Orders[i] = &Order{
			Id:                o.ID.String(),
			UserId:            o.UserID.String(),
			TradingPair:       o.TradingPair,
			Type:              string(o.Type),
			Side:              string(o.Side),
			Price:             o.Price.String(),
			Quantity:          o.Quantity.String(),
			FilledQuantity:    o.FilledQuantity.String(),
			RemainingQuantity: o.RemainingQuantity.String(),
			Status:            string(o.Status),
		}
	}

	return result, nil
}

// GetPosition implements the GetPosition RPC
func (s *Server) GetPosition(ctx context.Context, req *GetPositionRequest) (*Position, error) {
	userID, _ := uuid.Parse(req.UserId)

	position, err := s.tradingService.GetPosition(ctx, userID, req.TradingPair)
	if err != nil {
		return nil, err
	}

	return &Position{
		Id:               position.ID.String(),
		UserId:           position.UserID.String(),
		TradingPair:      position.TradingPair,
		Side:             string(position.Side),
		Size:             position.Size.String(),
		EntryPrice:       position.EntryPrice.String(),
		MarkPrice:        position.MarkPrice.String(),
		LiquidationPrice: position.LiquidationPrice.String(),
		Leverage:         position.Leverage.String(),
		UnrealizedPnl:    position.UnrealizedPnL.String(),
		RealizedPnl:      position.RealizedPnL.String(),
	}, nil
}

// GetUserPositions implements the GetUserPositions RPC
func (s *Server) GetUserPositions(ctx context.Context, req *GetUserPositionsRequest) (*PositionList, error) {
	userID, _ := uuid.Parse(req.UserId)

	positions, err := s.tradingService.GetUserPositions(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := &PositionList{Positions: make([]*Position, len(positions))}
	for i, p := range positions {
		result.Positions[i] = &Position{
			Id:               p.ID.String(),
			UserId:           p.UserID.String(),
			TradingPair:      p.TradingPair,
			Side:             string(p.Side),
			Size:             p.Size.String(),
			EntryPrice:       p.EntryPrice.String(),
			MarkPrice:        p.MarkPrice.String(),
			LiquidationPrice: p.LiquidationPrice.String(),
			Leverage:         p.Leverage.String(),
			UnrealizedPnl:    p.UnrealizedPnL.String(),
			RealizedPnl:      p.RealizedPnL.String(),
		}
	}

	return result, nil
}

// GetTicker implements the GetTicker RPC
func (s *Server) GetTicker(ctx context.Context, req *GetTickerRequest) (*Ticker, error) {
	ticker, err := s.tradingService.GetTicker(ctx, req.TradingPair)
	if err != nil {
		return nil, err
	}

	return &Ticker{
		TradingPair:           ticker.TradingPair,
		LastPrice:             ticker.LastPrice.String(),
		BidPrice:              ticker.BidPrice.String(),
		AskPrice:              ticker.AskPrice.String(),
		High24H:               ticker.High24h.String(),
		Low24H:                ticker.Low24h.String(),
		Volume24H:             ticker.Volume24h.String(),
		VolumeQuote24H:        ticker.VolumeQuote24h.String(),
		PriceChange24H:        ticker.PriceChange24h.String(),
		PriceChangePercent24H: ticker.PriceChangePercent24h.String(),
	}, nil
}

// GetOrderBook implements the GetOrderBook RPC
func (s *Server) GetOrderBook(ctx context.Context, req *GetOrderBookRequest) (*OrderBook, error) {
	depth := int(req.Depth)
	if depth == 0 {
		depth = 20
	}

	orderBook, err := s.tradingService.GetOrderBook(ctx, req.TradingPair, depth)
	if err != nil {
		return nil, err
	}

	result := &OrderBook{
		TradingPair: orderBook.TradingPair,
		Bids:        make([]*OrderBookLevel, len(orderBook.Bids)),
		Asks:        make([]*OrderBookLevel, len(orderBook.Asks)),
	}

	for i, bid := range orderBook.Bids {
		result.Bids[i] = &OrderBookLevel{
			Price:    bid.Price.String(),
			Quantity: bid.Quantity.String(),
		}
	}

	for i, ask := range orderBook.Asks {
		result.Asks[i] = &OrderBookLevel{
			Price:    ask.Price.String(),
			Quantity: ask.Quantity.String(),
		}
	}

	return result, nil
}

// Placeholder types for gRPC (would be generated from proto)
type CreateOrderRequest struct {
	UserId        string
	TradingPair   string
	Type          string
	Side          string
	Price         string
	Quantity      string
	StopPrice     string
	TimeInForce   string
	TradingType   string
	MarginMode    string
	Leverage      string
	ReduceOnly    bool
	PostOnly      bool
	ClientOrderId string
}

type CancelOrderRequest struct {
	OrderId string
	UserId  string
}

type CancelOrderResponse struct {
	Success bool
	Message string
}

type GetOpenOrdersRequest struct {
	UserId      string
	TradingPair string
}

type GetPositionRequest struct {
	UserId      string
	TradingPair string
}

type GetUserPositionsRequest struct {
	UserId string
}

type GetTickerRequest struct {
	TradingPair string
}

type GetOrderBookRequest struct {
	TradingPair string
	Depth       int32
}

type Order struct {
	Id                string
	UserId            string
	TradingPair       string
	Type              string
	Side              string
	Price             string
	Quantity          string
	FilledQuantity    string
	RemainingQuantity string
	Status            string
}

type OrderList struct {
	Orders []*Order
}

type Position struct {
	Id               string
	UserId           string
	TradingPair      string
	Side             string
	Size             string
	EntryPrice       string
	MarkPrice        string
	LiquidationPrice string
	Leverage         string
	UnrealizedPnl    string
	RealizedPnl      string
}

type PositionList struct {
	Positions []*Position
}

type Ticker struct {
	TradingPair           string
	LastPrice             string
	BidPrice              string
	AskPrice              string
	High24H               string
	Low24H                string
	Volume24H             string
	VolumeQuote24H        string
	PriceChange24H        string
	PriceChangePercent24H string
}

type OrderBook struct {
	TradingPair string
	Bids        []*OrderBookLevel
	Asks        []*OrderBookLevel
}

type OrderBookLevel struct {
	Price    string
	Quantity string
}
