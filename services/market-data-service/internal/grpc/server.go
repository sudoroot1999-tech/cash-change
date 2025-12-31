package grpc

import (
	"context"
	"net"

	"github.com/exchange/market-data-service/internal/pb"
	"github.com/exchange/market-data-service/internal/ticker"
	"github.com/exchange/market-data-service/internal/currency"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

type MarketGRPCServer struct {
	pb.UnimplementedMarketServiceServer
	tickerService   *ticker.TickerService
	currencyService *currency.Service
	logger          *zap.Logger
}

func NewMarketGRPCServer(ts *ticker.TickerService, cs *currency.Service, logger *zap.Logger) *MarketGRPCServer {
	return &MarketGRPCServer{
		tickerService:   ts,
		currencyService: cs,
		logger:          logger,
	}
}

func (s *MarketGRPCServer) GetTicker(ctx context.Context, req *pb.GetTickerRequest) (*pb.TickerResponse, error) {
	t := s.tickerService.GetTicker(req.Symbol)
	if t == nil {
		return &pb.TickerResponse{}, nil
	}

	return mapToPBTicker(t), nil
}

func (s *MarketGRPCServer) GetAllTickers(ctx context.Context, req *pb.Empty) (*pb.AllTickersResponse, error) {
	tickers := s.tickerService.GetAllTickers()
	pbTickers := make([]*pb.TickerResponse, len(tickers))
	for i, t := range tickers {
		pbTickers[i] = mapToPBTicker(t)
	}

	return &pb.AllTickersResponse{Tickers: pbTickers}, nil
}

func (s *MarketGRPCServer) GetOrderBook(ctx context.Context, req *pb.GetOrderBookRequest) (*pb.OrderBookResponse, error) {
	ob := s.tickerService.GetOrderBook(req.Symbol, int(req.Depth))
	if ob == nil {
		return &pb.OrderBookResponse{}, nil
	}

	bids := make([]*pb.OrderBookLevel, len(ob.Bids))
	for i, l := range ob.Bids {
		bids[i] = &pb.OrderBookLevel{Price: l.Price, Quantity: l.Quantity}
	}

	asks := make([]*pb.OrderBookLevel, len(ob.Asks))
	for i, l := range ob.Asks {
		asks[i] = &pb.OrderBookLevel{Price: l.Price, Quantity: l.Quantity}
	}

	return &pb.OrderBookResponse{
		Symbol:    ob.Symbol,
		Bids:      bids,
		Asks:      asks,
		Timestamp: ob.Timestamp,
	}, nil
}

func (s *MarketGRPCServer) GetRecentTrades(ctx context.Context, req *pb.GetRecentTradesRequest) (*pb.RecentTradesResponse, error) {
	trades := s.tickerService.GetRecentTrades(req.Symbol, int(req.Limit))
	pbTrades := make([]*pb.Trade, len(trades))
	for i, t := range trades {
		pbTrades[i] = &pb.Trade{
			Id:        t.ID,
			Symbol:    t.Symbol,
			Price:     t.Price,
			Quantity:  t.Quantity,
			Side:      t.Side,
			Timestamp: t.Timestamp,
		}
	}

	return &pb.RecentTradesResponse{Trades: pbTrades}, nil
}

func (s *MarketGRPCServer) GetKlines(ctx context.Context, req *pb.GetKlinesRequest) (*pb.KlinesResponse, error) {
	klines := s.tickerService.GetKlines(req.Symbol, req.Interval, int(req.Limit))
	pbKlines := make([]*pb.Kline, len(klines))
	for i, k := range klines {
		pbKlines[i] = &pb.Kline{
			OpenTime:    k.OpenTime,
			Open:        k.Open,
			High:        k.High,
			Low:         k.Low,
			Close:       k.Close,
			Volume:      k.Volume,
			CloseTime:   k.CloseTime,
			QuoteVolume: k.QuoteVolume,
			Trades:      int32(k.Trades),
		}
	}

	return &pb.KlinesResponse{Klines: pbKlines}, nil
}

func (s *MarketGRPCServer) SyncCurrencies(ctx context.Context, req *pb.Empty) (*pb.SyncCurrenciesResponse, error) {
	if err := s.currencyService.SyncCurrencies(ctx); err != nil {
		return &pb.SyncCurrenciesResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.SyncCurrenciesResponse{Success: true, Message: "Currencies synced successfully"}, nil
}

func (s *MarketGRPCServer) ListCurrencies(ctx context.Context, req *pb.Empty) (*pb.ListCurrenciesResponse, error) {
	currencies, err := s.currencyService.ListCurrencies()
	if err != nil {
		return &pb.ListCurrenciesResponse{}, err
	}

	pbCurrencies := make([]*pb.Currency, len(currencies))
	for i, c := range currencies {
		pbCurrencies[i] = &pb.Currency{
			Id:     c.ID,
			Symbol: c.Symbol,
			Name:   c.Name,
		}
	}

	return &pb.ListCurrenciesResponse{Currencies: pbCurrencies}, nil
}

func mapToPBTicker(t *ticker.Ticker) *pb.TickerResponse {
	return &pb.TickerResponse{
		Symbol:             t.Symbol,
		LastPrice:          t.LastPrice,
		PriceChange:        t.PriceChange,
		PriceChangePercent: t.PriceChangePercent,
		High_24H:           t.High24h,
		Low_24H:            t.Low24h,
		Volume_24H:         t.Volume24h,
		QuoteVolume_24H:    t.QuoteVolume24h,
		OpenPrice:          t.OpenPrice,
		ClosePrice:         t.ClosePrice,
		BidPrice:           t.BidPrice,
		AskPrice:           t.AskPrice,
		Timestamp:          t.Timestamp,
	}
}

func StartGRPCServer(port string, ts *ticker.TickerService, cs *currency.Service, logger *zap.Logger) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		logger.Fatal("Failed to listen for gRPC", zap.Error(err))
	}

	s := grpc.NewServer()
	pb.RegisterMarketServiceServer(s, NewMarketGRPCServer(ts, cs, logger))

	logger.Info("Starting Market Data gRPC server", zap.String("port", port))
	if err := s.Serve(lis); err != nil {
		logger.Fatal("Failed to serve gRPC", zap.Error(err))
	}
}
