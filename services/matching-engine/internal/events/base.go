package events

import (
	"time"

	"github.com/google/uuid"
)

// BaseEvent contains common fields for all events
// Matches the Node.js messaging package structure
type BaseEvent struct {
	EventID   string    `json:"eventId"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// NewBaseEvent creates a new base event with generated ID
func NewBaseEvent() BaseEvent {
	return BaseEvent{
		EventID:   uuid.New().String(),
		Timestamp: time.Now().UTC(),
		Version:   "1.0",
	}
}

// EventMetadata for tracking and debugging
type EventMetadata struct {
	CorrelationID string `json:"correlationId,omitempty"`
	CausationID   string `json:"causationId,omitempty"`
	UserID        string `json:"userId,omitempty"`
	TraceID       string `json:"traceId,omitempty"`
}
