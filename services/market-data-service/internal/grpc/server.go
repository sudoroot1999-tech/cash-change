package grpc

import (
	"context"
	"fmt"
	"net"

	"github.com/trading-platform/market-data-service/internal/services"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Server is the gRPC server
type Server struct {
	service    *services.MarketDataService
	grpcServer *grpc.Server
	logger     *zap.Logger
}

// NewServer creates a new gRPC server
func NewServer(service *services.MarketDataService, logger *zap.Logger) *Server {
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(10*1024*1024),
		grpc.MaxSendMsgSize(10*1024*1024),
	)

	server := &Server{
		service:    service,
		grpcServer: grpcServer,
		logger:     logger,
	}

	// Register the service
	RegisterMarketDataServiceServer(grpcServer, server)

	// Enable reflection for debugging
	reflection.Register(grpcServer)

	return server
}

// Start starts the gRPC server
func (s *Server) Start(port string) error {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	s.logger.Info("✅ gRPC server starting", zap.String("port", port))
	return s.grpcServer.Serve(lis)
}

// Stop stops the gRPC server
func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

// GetTicker implements the gRPC GetTicker method
func (s *Server) GetTicker(ctx context.Context, req *GetTickerRequest) (*TickerResponse, error) {
	ticker, err := s.service.GetTicker(ctx, req.TradingPair)
	if err != nil {
		return nil, err
	}

	return &TickerResponse{
		Symbol:         ticker.Symbol,
		TradingPair:    ticker.TradingPair,
		Price:          ticker.Price.String(),
		PriceChange:    ticker.PriceChange.String(),
		PriceChangePct: ticker.PriceChangePct.String(),
		High_24H:       ticker.High24h.String(),
		Low_24H:        ticker.Low24h.String(),
		Volume_24H:     ticker.Volume24h.String(),
		QuoteVolume:    ticker.QuoteVolume.String(),
		BidPrice:       ticker.BidPrice.String(),
		AskPrice:       ticker.AskPrice.String(),
		Source:         string(ticker.Source),
		Timestamp:      ticker.Timestamp.Unix(),
	}, nil
}


// GetTickers implements the gRPC GetTickers method
func (s *Server) GetTickers(ctx context.Context, req *GetTickersRequest) (*TickersResponse, error) {
	tickers, err := s.service.GetTickers(ctx, req.TradingPairs)
	if err != nil {
		return nil, err
	}

	response := &TickersResponse{
		Tickers: make([]*TickerResponse, len(tickers)),
	}

	for i, ticker := range tickers {
		response.Tickers[i] = &TickerResponse{
			Symbol:         ticker.Symbol,
			TradingPair:    ticker.TradingPair,
			Price:          ticker.Price.String(),
			PriceChange:    ticker.PriceChange.String(),
			PriceChangePct: ticker.PriceChangePct.String(),
			High_24H:       ticker.High24h.String(),
			Low_24H:        ticker.Low24h.String(),
			Volume_24H:     ticker.Volume24h.String(),
			QuoteVolume:    ticker.QuoteVolume.String(),
			BidPrice:       ticker.BidPrice.String(),
			AskPrice:       ticker.AskPrice.String(),
			Source:         string(ticker.Source),
			Timestamp:      ticker.Timestamp.Unix(),
		}
	}

	return response, nil
}

// GetOrderbook implements the gRPC GetOrderbook method
func (s *Server) GetOrderbook(ctx context.Context, req *GetOrderbookRequest) (*OrderbookResponse, error) {
	orderbook, err := s.service.GetOrderbook(ctx, req.TradingPair, int(req.Limit))
	if err != nil {
		return nil, err
	}

	bids := make([]*PriceLevel, len(orderbook.Bids))
	for i, bid := range orderbook.Bids {
		bids[i] = &PriceLevel{
			Price:    bid.Price.String(),
			Quantity: bid.Quantity.String(),
		}
	}

	asks := make([]*PriceLevel, len(orderbook.Asks))
	for i, ask := range orderbook.Asks {
		asks[i] = &PriceLevel{
			Price:    ask.Price.String(),
			Quantity: ask.Quantity.String(),
		}
	}

	return &OrderbookResponse{
		TradingPair:  orderbook.TradingPair,
		Bids:         bids,
		Asks:         asks,
		LastUpdateId: orderbook.LastUpdateID,
		Source:       string(orderbook.Source),
		Timestamp:    orderbook.Timestamp.Unix(),
	}, nil
}

// GetKlines implements the gRPC GetKlines method
func (s *Server) GetKlines(ctx context.Context, req *GetKlinesRequest) (*KlinesResponse, error) {
	klines, err := s.service.GetKlines(ctx, req.TradingPair, req.Interval, int(req.Limit))
	if err != nil {
		return nil, err
	}

	response := &KlinesResponse{
		Klines: make([]*Kline, len(klines)),
	}

	for i, kline := range klines {
		response.Klines[i] = &Kline{
			TradingPair: kline.TradingPair,
			Interval:    kline.Interval,
			OpenTime:    kline.OpenTime.Unix(),
			CloseTime:   kline.CloseTime.Unix(),
			Open:        kline.Open.String(),
			High:        kline.High.String(),
			Low:         kline.Low.String(),
			Close:       kline.Close.String(),
			Volume:      kline.Volume.String(),
			QuoteVolume: kline.QuoteVolume.String(),
			TradeCount:  kline.TradeCount,
			Source:      string(kline.Source),
		}
	}

	return response, nil
}

// GetRecentTrades implements the gRPC GetRecentTrades method
func (s *Server) GetRecentTrades(ctx context.Context, req *GetRecentTradesRequest) (*TradesResponse, error) {
	trades, err := s.service.GetRecentTrades(ctx, req.TradingPair, int(req.Limit))
	if err != nil {
		return nil, err
	}

	response := &TradesResponse{
		Trades: make([]*Trade, len(trades)),
	}

	for i, trade := range trades {
		response.Trades[i] = &Trade{
			Id:          trade.ID,
			TradingPair: trade.TradingPair,
			Price:       trade.Price.String(),
			Quantity:    trade.Quantity.String(),
			Side:        trade.Side,
			Timestamp:   trade.Timestamp.Unix(),
			Source:      string(trade.Source),
		}
	}

	return response, nil
}

// GetMarketInfo implements the gRPC GetMarketInfo method
func (s *Server) GetMarketInfo(ctx context.Context, req *GetMarketInfoRequest) (*MarketInfoResponse, error) {
	info, err := s.service.GetMarketInfo(ctx, req.Symbol)
	if err != nil {
		return nil, err
	}

	return &MarketInfoResponse{
		Symbol:            info.Symbol,
		Name:              info.Name,
		AssetType:         string(info.AssetType),
		MarketCap:         info.MarketCap.String(),
		MarketCapRank:     int32(info.MarketCapRank),
		CirculatingSupply: info.CirculatingSupply.String(),
		TotalSupply:       info.TotalSupply.String(),
		MaxSupply:         info.MaxSupply.String(),
		Ath:               info.ATH.String(),
		AthDate:           info.ATHDate.Unix(),
		Atl:               info.ATL.String(),
		AtlDate:           info.ATLDate.Unix(),
		LastUpdated:       info.LastUpdated.Unix(),
	}, nil
}

// StreamTicker implements the gRPC StreamTicker method
func (s *Server) StreamTicker(req *StreamTickerRequest, stream MarketDataService_StreamTickerServer) error {
	// This would be implemented with WebSocket subscription
	// For now, return unimplemented
	return fmt.Errorf("streaming not implemented yet")
}

// StreamOrderbook implements the gRPC StreamOrderbook method
func (s *Server) StreamOrderbook(req *StreamOrderbookRequest, stream MarketDataService_StreamOrderbookServer) error {
	// This would be implemented with WebSocket subscription
	return fmt.Errorf("streaming not implemented yet")
}

// HealthCheck implements the gRPC HealthCheck method
func (s *Server) HealthCheck(ctx context.Context, req *HealthCheckRequest) (*HealthCheckResponse, error) {
	health := s.service.HealthCheck(ctx)

	details := make(map[string]string)
	for k, v := range health {
		details[k] = fmt.Sprintf("%v", v)
	}

	return &HealthCheckResponse{
		Healthy: true,
		Details: details,
	}, nil
}

// mustEmbedUnimplementedMarketDataServiceServer implements the interface
func (s *Server) mustEmbedUnimplementedMarketDataServiceServer() {}
