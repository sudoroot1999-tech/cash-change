package matching_grpc

import (
	"context"
	"fmt"

	"github.com/exchange/matching-engine/internal/engine"
	"github.com/exchange/matching-engine/internal/pb"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

type MatchingGRPCServer struct {
	pb.UnimplementedMatchingServiceServer
	engine *engine.MatchingEngine
	logger *zap.Logger
}

func NewMatchingGRPCServer(e *engine.MatchingEngine, logger *zap.Logger) *MatchingGRPCServer {
	return &MatchingGRPCServer{
		engine: e,
		logger: logger,
	}
}

func (s *MatchingGRPCServer) SubmitOrder(ctx context.Context, req *pb.SubmitOrderRequest) (*pb.SubmitOrderResponse, error) {
	// Parse quantities
	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		return nil, fmt.Errorf("invalid quantity: %w", err)
	}

	var price decimal.Decimal
	if req.Type == "limit" || req.Type == "stop_limit" {
		if req.Price == "" {
			return nil, fmt.Errorf("price required for limit orders")
		}
		price, err = decimal.NewFromString(req.Price)
		if err != nil {
			return nil, fmt.Errorf("invalid price: %w", err)
		}
	}

	order := &engine.Order{
		ID:            req.Id,
		UserID:        req.UserId,
		Symbol:        req.Symbol,
		Side:          engine.OrderSide(req.Side),
		Type:          engine.OrderType(req.Type),
		Price:         price,
		Quantity:      quantity,
		TimeInForce:   req.TimeInForce,
		ClientOrderID: req.ClientOrderId,
	}

	if req.StopPrice != "" {
		stopPrice, err := decimal.NewFromString(req.StopPrice)
		if err == nil {
			order.StopPrice = stopPrice
		}
	}

	trades, err := s.engine.SubmitOrder(order)
	if err != nil {
		s.logger.Error("Failed to submit order via gRPC", zap.Error(err))
		return nil, fmt.Errorf("failed to process order: %w", err)
	}

	// Map to gRPC response
	pbOrder := mapToPBOrder(order)
	pbTrades := make([]*pb.Trade, len(trades))
	for i, t := range trades {
		pbTrades[i] = mapToPBTrade(t)
	}

	return &pb.SubmitOrderResponse{
		Order:  pbOrder,
		Trades: pbTrades,
	}, nil
}

func (s *MatchingGRPCServer) CancelOrder(ctx context.Context, req *pb.CancelOrderRequest) (*pb.CancelOrderResponse, error) {
	order, err := s.engine.CancelOrder(req.Symbol, req.Id)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel order: %w", err)
	}

	if order == nil {
		return nil, fmt.Errorf("order not found")
	}

	return &pb.CancelOrderResponse{
		Order: mapToPBOrder(order),
	}, nil
}

func mapToPBOrder(o *engine.Order) *pb.Order {
	return &pb.Order{
		Id:                o.ID,
		UserId:            o.UserID,
		Symbol:            o.Symbol,
		Side:              string(o.Side),
		Type:              string(o.Type),
		Status:            string(o.Status),
		Price:             o.Price.String(),
		Quantity:          o.Quantity.String(),
		FilledQuantity:    o.FilledQuantity.String(),
		RemainingQuantity: o.RemainingQty.String(),
		StopPrice:         o.StopPrice.String(),
		TimeInForce:       o.TimeInForce,
		ClientOrderId:     o.ClientOrderID,
		CreatedAt:         o.CreatedAt.String(),
		UpdatedAt:         o.UpdatedAt.String(),
	}
}

func mapToPBTrade(t *engine.Trade) *pb.Trade {
	return &pb.Trade{
		Id:            t.ID,
		Symbol:        t.Symbol,
		BuyerOrderId:  t.BuyerOrderID,
		SellerOrderId: t.SellerOrderID,
		BuyerId:       t.BuyerID,
		SellerId:      t.SellerID,
		Price:         t.Price.String(),
		Quantity:      t.Quantity.String(),
		IsBuyerMaker:  t.IsBuyerMaker,
		CreatedAt:     t.CreatedAt.String(),
	}
}
