package currency

import (
	"context"
	"time"

	"github.com/exchange/market-data-service/internal/marketdata"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Currency struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Symbol    string    `gorm:"index" json:"symbol"`
	Name      string    `json:"name"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Service struct {
	db       *gorm.DB
	provider marketdata.Provider
	logger   *zap.Logger
}

func NewService(db *gorm.DB, provider marketdata.Provider, logger *zap.Logger) *Service {
	// Auto migrate
	db.AutoMigrate(&Currency{})

	return &Service{
		db:       db,
		provider: provider,
		logger:   logger,
	}
}

func (s *Service) SyncCurrencies(ctx context.Context) error {
	s.logger.Info("Starting currency synchronization")

	currencies, err := s.provider.GetCurrencies(ctx)
	if err != nil {
		return err
	}

	s.logger.Info("Fetched currencies from provider", zap.Int("count", len(currencies)))

	// Batch insert/update
	for _, c := range currencies {
		curr := Currency{
			ID:     c.ID,
			Symbol: c.Symbol,
			Name:   c.Name,
		}

		// Use upsert
		if err := s.db.Save(&curr).Error; err != nil {
			s.logger.Error("Failed to save currency", zap.String("id", c.ID), zap.Error(err))
			continue
		}
	}

	s.logger.Info("Currency synchronization completed")
	return nil
}

func (s *Service) ListCurrencies() ([]Currency, error) {
	var currencies []Currency
	if err := s.db.Find(&currencies).Error; err != nil {
		return nil, err
	}
	return currencies, nil
}
