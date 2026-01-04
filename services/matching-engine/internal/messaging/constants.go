package messaging

// EXCHANGES - RabbitMQ exchange names (matching Node.js package)
const (
	ExchangeTradingEvents        = "trading.events"
	ExchangeMatchingEngineEvents = "matching.events"
	ExchangeMarketDataEvents     = "market.data.events"
	ExchangeWalletEvents         = "wallet.events"
	ExchangeNotificationEvents   = "notification.events"
	ExchangeDLX                  = "dlx.exchange"
)

// QUEUES - RabbitMQ queue names
const (
	QueueMatchingOrderProcess    = "matching.order.process"
	QueueMatchingOrderReceived   = "matching.order.received"
	QueueMatchingOrderbookUpdate = "matching.orderbook.update"
	QueueOrderMatched            = "trading.order.matched"
	QueueOrderFilled             = "trading.order.filled"
	QueueTradeExecute            = "trading.trade.execute"
	QueueBalanceUpdate           = "wallet.balance.update"
	QueueDLXQueue                = "dlx.queue"
)

// ROUTING_KEYS - RabbitMQ routing keys
const (
	RoutingKeyMatchingOrderReceived         = "matching.order.received"
	RoutingKeyMatchingOrderMatch            = "matching.order.match"
	RoutingKeyMatchingOrderbookStateChanged = "matching.orderbook.state.changed"
	RoutingKeyMatchingEngineHealth          = "matching.engine.health"
	RoutingKeyCircuitBreakerTriggered       = "matching.circuit.breaker.triggered"
	RoutingKeyOrderPlaced                   = "trading.order.placed"
	RoutingKeyOrderMatched                  = "trading.order.matched"
	RoutingKeyTradeExecuted                 = "trading.trade.executed"
	RoutingKeyBalanceUpdated                = "wallet.balance.updated"
)

// KAFKA_TOPICS - Kafka topic names
const (
	TopicTradingEvents        = "trading-events"
	TopicMatchingEngineEvents = "matching-engine-events"
	TopicOrderbookSnapshots   = "orderbook-snapshots"
	TopicMarketDataTicker     = "market-data-ticker"
	TopicMarketDataTrades     = "market-data-trades"
	TopicMarketDataOrderbook  = "market-data-orderbook"
	TopicAuditLogs            = "audit-logs"
	TopicSystemMetrics        = "system-metrics"
)

// Consumer Groups
const (
	ConsumerGroupMatchingEngine = "matching-engine"
)
