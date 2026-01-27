package messaging

// EXCHANGES - RabbitMQ exchange names
const (
	ExchangeTradingEvents        = "trading.events"
	ExchangeMatchingEngineEvents = "matching.events"
	ExchangeMarketDataEvents     = "market.data.events"
	ExchangeWalletEvents         = "wallet.events"
	ExchangeSocialTradingEvents  = "social.trading.events"
	ExchangeNotificationEvents   = "notification.events"
	ExchangeDLX                  = "dlx.exchange"
)

// QUEUES - RabbitMQ queue names
const (
	// Trading queues
	QueueTradingOrderCreate   = "trading.order.create"
	QueueTradingOrderCancel   = "trading.order.cancel"
	QueueTradingOrderUpdate   = "trading.order.update"
	QueueTradingTradeExecuted = "trading.trade.executed"
	QueueTradingPositionUpdate = "trading.position.update"

	// Matching engine queues
	QueueMatchingOrderProcess  = "matching.order.process"
	QueueMatchingOrderReceived = "matching.order.received"
	QueueMatchingTradeResult   = "matching.trade.result"

	// Wallet queues
	QueueWalletBalanceReserve  = "wallet.balance.reserve"
	QueueWalletBalanceRelease  = "wallet.balance.release"
	QueueWalletBalanceUpdate   = "wallet.balance.update"
	QueueWalletTradeSettle     = "wallet.trade.settle"

	// Social trading queues
	QueueSocialCopyTrade       = "social.copy.trade"
	QueueSocialTradeSignal     = "social.trade.signal"
	QueueSocialPerformanceUpdate = "social.performance.update"

	// Market data queues
	QueueMarketDataTicker      = "market.data.ticker"
	QueueMarketDataOrderbook   = "market.data.orderbook"

	// DLX
	QueueDLXQueue = "dlx.queue"
)

// ROUTING_KEYS - RabbitMQ routing keys
const (
	// Trading routing keys
	RoutingKeyOrderCreated     = "trading.order.created"
	RoutingKeyOrderCancelled   = "trading.order.cancelled"
	RoutingKeyOrderMatched     = "trading.order.matched"
	RoutingKeyOrderFilled      = "trading.order.filled"
	RoutingKeyOrderRejected    = "trading.order.rejected"
	RoutingKeyTradeExecuted    = "trading.trade.executed"
	RoutingKeyPositionOpened   = "trading.position.opened"
	RoutingKeyPositionClosed   = "trading.position.closed"
	RoutingKeyPositionUpdated  = "trading.position.updated"
	RoutingKeyLiquidation      = "trading.liquidation"

	// Wallet routing keys
	RoutingKeyBalanceReserved  = "wallet.balance.reserved"
	RoutingKeyBalanceReleased  = "wallet.balance.released"
	RoutingKeyBalanceUpdated   = "wallet.balance.updated"
	RoutingKeyTradeSettled     = "wallet.trade.settled"

	// Social trading routing keys
	RoutingKeyCopyTradeCreated = "social.copy.trade.created"
	RoutingKeyTradeSignal      = "social.trade.signal"

	// Market data routing keys
	RoutingKeyTickerUpdated    = "market.data.ticker.updated"
	RoutingKeyOrderbookUpdated = "market.data.orderbook.updated"
)

// KAFKA_TOPICS - Kafka topic names
const (
	TopicTradingEvents        = "trading-events"
	TopicMatchingEngineEvents = "matching-engine-events"
	TopicOrderbookSnapshots   = "orderbook-snapshots"
	TopicMarketDataTicker     = "market-data-ticker"
	TopicMarketDataTrades     = "market-data-trades"
	TopicMarketDataOrderbook  = "market-data-orderbook"
	TopicWalletEvents         = "wallet-events"
	TopicSocialTradingEvents  = "social-trading-events"
	TopicAuditLogs            = "audit-logs"
	TopicSystemMetrics        = "system-metrics"
)

// Consumer Groups
const (
	ConsumerGroupTrading       = "trading-service"
	ConsumerGroupMatchingEngine = "matching-engine"
	ConsumerGroupWallet        = "wallet-service"
	ConsumerGroupSocialTrading = "social-trading-service"
)
