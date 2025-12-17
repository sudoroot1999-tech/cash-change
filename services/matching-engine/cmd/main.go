package main

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/exchange/matching-engine/internal/engine"
	"github.com/exchange/matching-engine/internal/handlers"
	"github.com/exchange/matching-engine/internal/messaging"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "3010"
	}

	// redisURL := os.Getenv("REDIS_URL")
	rabbitmqURL := rabbitmqURLFromEnv()

	// Initialize matching engine
	matchingEngine := engine.NewMatchingEngine(logger)

	// Initialize message broker
	var msgBroker *messaging.RabbitMQ
	if rabbitmqURL != "" {
		var err error
		msgBroker, err = messaging.NewRabbitMQ(rabbitmqURL, logger)
		if err != nil {
			logger.Fatal("Failed to connect to RabbitMQ", zap.Error(err))
		}
		defer msgBroker.Close()

		// Start consuming orders
		go msgBroker.ConsumeOrders(matchingEngine)
	}

	// Initialize HTTP handlers
	handler := handlers.NewHandler(matchingEngine, msgBroker, logger)

	// Setup Gin router
	if os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health endpoints
	router.GET("/health", handler.Health)
	router.GET("/health/ready", handler.Ready)
	router.GET("/health/live", handler.Live)

	// API endpoints
	api := router.Group("/api/v1")
	{
		api.POST("/orders", handler.SubmitOrder)
		api.DELETE("/orders/:id", handler.CancelOrder)
		api.GET("/orderbook/:symbol", handler.GetOrderBook)
		api.GET("/orderbook/:symbol/depth", handler.GetOrderBookDepth)
		api.GET("/trades/:symbol/recent", handler.GetRecentTrades)
		api.GET("/stats", handler.GetStats)
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting Matching Engine", zap.String("port", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server error", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited properly")
}

func rabbitmqURLFromEnv() string {
	// Prefer explicit URL if provided
	if v := os.Getenv("RABBITMQ_URL"); v != "" {
		return v
	}

	host := getenv("RABBITMQ_HOST", "rabbitmq")
	port := getenv("RABBITMQ_PORT", "5672")
	user := getenv("RABBITMQ_USER", "exchange")
	pass := getenv("RABBITMQ_PASSWORD", "rabbitmq_dev_password")

	u := url.URL{
		Scheme: "amqp",
		Host:   fmt.Sprintf("%s:%s", host, port),
	}
	u.User = url.UserPassword(user, pass)
	return u.String()
}

func getenv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
