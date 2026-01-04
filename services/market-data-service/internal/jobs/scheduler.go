package jobs

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ScheduledJob represents a job that runs on a schedule
type ScheduledJob struct {
	Name     string
	Type     JobType
	Interval time.Duration
	Payload  interface{}
	Enabled  bool
}

// Scheduler manages scheduled jobs
type Scheduler struct {
	jobs       []*ScheduledJob
	workerPool *WorkerPool
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	logger     *zap.Logger
}

// NewScheduler creates a new scheduler
func NewScheduler(workerPool *WorkerPool, logger *zap.Logger) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		jobs:       make([]*ScheduledJob, 0),
		workerPool: workerPool,
		ctx:        ctx,
		cancel:     cancel,
		logger:     logger,
	}
}

// AddJob adds a scheduled job
func (s *Scheduler) AddJob(job *ScheduledJob) {
	s.jobs = append(s.jobs, job)
}

// Start starts the scheduler
func (s *Scheduler) Start() {
	s.logger.Info("Starting scheduler", zap.Int("jobs", len(s.jobs)))

	for _, job := range s.jobs {
		if job.Enabled {
			s.wg.Add(1)
			go s.runJob(job)
		}
	}
}

func (s *Scheduler) runJob(scheduledJob *ScheduledJob) {
	defer s.wg.Done()

	ticker := time.NewTicker(scheduledJob.Interval)
	defer ticker.Stop()

	// Run immediately on start
	s.submitJob(scheduledJob)

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.submitJob(scheduledJob)
		}
	}
}

func (s *Scheduler) submitJob(scheduledJob *ScheduledJob) {
	job := &Job{
		ID:         uuid.New().String(),
		Type:       scheduledJob.Type,
		Payload:    scheduledJob.Payload,
		Priority:   1,
		MaxRetries: 3,
	}

	if !s.workerPool.Submit(job) {
		s.logger.Warn("Failed to submit scheduled job", zap.String("name", scheduledJob.Name))
	}
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	s.cancel()
	s.wg.Wait()
	s.logger.Info("Scheduler stopped")
}

// EnableJob enables a job by name
func (s *Scheduler) EnableJob(name string) {
	for _, job := range s.jobs {
		if job.Name == name {
			job.Enabled = true
			return
		}
	}
}

// DisableJob disables a job by name
func (s *Scheduler) DisableJob(name string) {
	for _, job := range s.jobs {
		if job.Name == name {
			job.Enabled = false
			return
		}
	}
}
