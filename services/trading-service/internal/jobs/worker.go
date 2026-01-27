package jobs

import (
	"context"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Job represents a job to be processed
type Job struct {
	ID        string
	Type      JobType
	Payload   interface{}
	Priority  int
	CreatedAt time.Time
	Retries   int
	MaxRetries int
}

// JobType represents the type of job
type JobType string

const (
	JobTypeOrderProcess    JobType = "ORDER_PROCESS"
	JobTypeOrderCancel     JobType = "ORDER_CANCEL"
	JobTypeTradeSettle     JobType = "TRADE_SETTLE"
	JobTypePositionUpdate  JobType = "POSITION_UPDATE"
	JobTypeCopyTrade       JobType = "COPY_TRADE"
	JobTypeRiskCheck       JobType = "RISK_CHECK"
	JobTypeLiquidation     JobType = "LIQUIDATION"
)

// JobHandler is a function that processes a job
type JobHandler func(ctx context.Context, job *Job) error

// WorkerPool manages a pool of workers
type WorkerPool struct {
	name       string
	workers    int
	jobQueue   chan *Job
	handlers   map[JobType]JobHandler
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	logger     *zap.Logger
	metrics    *WorkerMetrics
}

// WorkerMetrics tracks worker pool metrics
type WorkerMetrics struct {
	mu             sync.RWMutex
	JobsProcessed  int64
	JobsFailed     int64
	JobsRetried    int64
	AverageLatency time.Duration
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(name string, workers int, queueSize int, logger *zap.Logger) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WorkerPool{
		name:     name,
		workers:  workers,
		jobQueue: make(chan *Job, queueSize),
		handlers: make(map[JobType]JobHandler),
		ctx:      ctx,
		cancel:   cancel,
		logger:   logger,
		metrics:  &WorkerMetrics{},
	}
}

// RegisterHandler registers a handler for a job type
func (wp *WorkerPool) RegisterHandler(jobType JobType, handler JobHandler) {
	wp.handlers[jobType] = handler
}

// Start starts the worker pool
func (wp *WorkerPool) Start() {
	wp.logger.Info("Starting worker pool", zap.String("name", wp.name), zap.Int("workers", wp.workers))

	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}

	// Start metrics reporter
	go wp.reportMetrics()
}

// worker processes jobs from the queue
func (wp *WorkerPool) worker(id int) {
	defer wp.wg.Done()

	for {
		select {
		case <-wp.ctx.Done():
			return
		case job := <-wp.jobQueue:
			wp.processJob(id, job)
		}
	}
}

// processJob processes a single job
func (wp *WorkerPool) processJob(workerID int, job *Job) {
	startTime := time.Now()

	handler, ok := wp.handlers[job.Type]
	if !ok {
		wp.logger.Error("No handler for job type", zap.String("type", string(job.Type)))
		return
	}

	ctx, cancel := context.WithTimeout(wp.ctx, 30*time.Second)
	defer cancel()

	err := handler(ctx, job)
	latency := time.Since(startTime)

	wp.metrics.mu.Lock()
	if err != nil {
		wp.metrics.JobsFailed++
		if job.Retries < job.MaxRetries {
			job.Retries++
			wp.metrics.JobsRetried++
			wp.jobQueue <- job // Retry
		}
		wp.logger.Error("Job failed",
			zap.String("job_id", job.ID),
			zap.String("type", string(job.Type)),
			zap.Int("retries", job.Retries),
			zap.Error(err),
		)
	} else {
		wp.metrics.JobsProcessed++
		wp.metrics.AverageLatency = (wp.metrics.AverageLatency + latency) / 2
	}
	wp.metrics.mu.Unlock()
}

// Submit submits a job to the worker pool
func (wp *WorkerPool) Submit(job *Job) {
	if job.MaxRetries == 0 {
		job.MaxRetries = 3
	}
	job.CreatedAt = time.Now()

	select {
	case wp.jobQueue <- job:
	default:
		wp.logger.Warn("Job queue full, dropping job", zap.String("job_id", job.ID))
	}
}

// Stop stops the worker pool
func (wp *WorkerPool) Stop() {
	wp.cancel()
	wp.wg.Wait()
	close(wp.jobQueue)
	wp.logger.Info("Worker pool stopped", zap.String("name", wp.name))
}

// reportMetrics reports worker pool metrics
func (wp *WorkerPool) reportMetrics() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-wp.ctx.Done():
			return
		case <-ticker.C:
			wp.metrics.mu.RLock()
			wp.logger.Info("Worker pool metrics",
				zap.String("name", wp.name),
				zap.Int64("processed", wp.metrics.JobsProcessed),
				zap.Int64("failed", wp.metrics.JobsFailed),
				zap.Int64("retried", wp.metrics.JobsRetried),
				zap.Duration("avg_latency", wp.metrics.AverageLatency),
			)
			wp.metrics.mu.RUnlock()
		}
	}
}

// QueueSize returns the current queue size
func (wp *WorkerPool) QueueSize() int {
	return len(wp.jobQueue)
}
