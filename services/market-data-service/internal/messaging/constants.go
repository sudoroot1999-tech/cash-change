package messaging

// EXCHANGES - RabbitMQ exchange names
const (
	ExchangeMarketDataEvents     = "market.data.events"
	ExchangeTradingEvents        = "trading.events"
	ExchangeMatchingEngineEvents = "matching.events"
	ExchangeNotificationEvents   = "notification.events"
	ExchangeDLX                  = "dlx.exchange"
)

// QUEUES - RabbitMQ queue names
const (
	// Market Data queues
	QueueMarketDataTicker       = "market.data.ticker"
	QueueMarketDataOrderbook    = "market.data.orderbook"
	QueueMarketDataKline        = "market.data.kline"
	QueueMarketDataTrade        = "market.data.trade"
	QueueMarketDataMarketInfo   = "market.data.market.info"
	QueueMarketDataNFT          = "market.data.nft"
	QueueMarketDataRWA          = "market.data.rwa"

	// Matching Engine integration
	QueueMatchingOrderbookUpdate = "matching.orderbook.update"
	QueueMatchingTradeExecuted   = "matching.trade.executed"

	// Trading integration
	QueueTradingPriceUpdate = "trading.price.update"

	// DLX
	QueueDLXQueue = "dlx.queue"
)

// ROUTING_KEYS - RabbitMQ routing keys
const (
	// Market Data routing keys
	RoutingKeyTickerUpdated     = "market.data.ticker.updated"
	RoutingKeyOrderbookUpdated  = "market.data.orderbook.updated"
	RoutingKeyKlineUpdated      = "market.data.kline.updated"
	RoutingKeyTradeExecuted     = "market.data.trade.executed"
	RoutingKeyMarketInfoUpdated = "market.data.market.info.updated"
	RoutingKeyNFTUpdated        = "market.data.nft.updated"
	RoutingKeyRWAUpdated        = "market.data.rwa.updated"

	// Matching Engine routing keys
	RoutingKeyMatchingOrderbook = "matching.orderbook.state.changed"
	RoutingKeyMatchingTrade     = "matching.trade.executed"
)


// KAFKA_TOPICS - Kafka topic names
const (
	TopicMarketDataTicker     = "market-data-ticker"
	TopicMarketDataOrderbook  = "market-data-orderbook"
	TopicMarketDataTrades     = "market-data-trades"
	TopicMarketDataKline      = "market-data-kline"
	TopicMarketDataMarketInfo = "market-data-market-info"
	TopicMarketDataNFT        = "market-data-nft"
	TopicMarketDataRWA        = "market-data-rwa"
	TopicOrderbookSnapshots   = "orderbook-snapshots"
	TopicMatchingEngineEvents = "matching-engine-events"
	TopicTradingEvents        = "trading-events"
	TopicAuditLogs            = "audit-logs"
	TopicSystemMetrics        = "system-metrics"
)

// Consumer Groups
const (
	ConsumerGroupMarketData    = "market-data-service"
	ConsumerGroupMatchingEngine = "matching-engine"
	ConsumerGroupTrading       = "trading-service"
)

// Event Types
const (
	EventTypeTickerUpdate     = "TICKER_UPDATE"
	EventTypeOrderbookUpdate  = "ORDERBOOK_UPDATE"
	EventTypeKlineUpdate      = "KLINE_UPDATE"
	EventTypeTradeUpdate      = "TRADE_UPDATE"
	EventTypeMarketInfoUpdate = "MARKET_INFO_UPDATE"
	EventTypeNFTUpdate        = "NFT_UPDATE"
	EventTypeRWAUpdate        = "RWA_UPDATE"
)
