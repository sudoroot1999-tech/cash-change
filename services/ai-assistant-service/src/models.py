"""Database models for PostgreSQL."""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from src.database import Base


class SignalType(str, enum.Enum):
    """Trading signal types."""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class SignalSource(str, enum.Enum):
    """Signal source types."""
    TECHNICAL = "technical"
    SENTIMENT = "sentiment"
    AI_MODEL = "ai_model"
    PATTERN = "pattern"
    COMBINED = "combined"


class ModelType(str, enum.Enum):
    """AI model types."""
    LSTM = "lstm"
    TRANSFORMER = "transformer"
    SENTIMENT = "sentiment"
    CLASSIFICATION = "classification"
    REINFORCEMENT = "reinforcement"


class TradingSignal(Base):
    """Trading signal model."""
    
    __tablename__ = "trading_signals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pair = Column(String(20), nullable=False, index=True)
    signal_type = Column(SQLEnum(SignalType), nullable=False)
    signal_source = Column(SQLEnum(SignalSource), nullable=False)
    confidence = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    target_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    indicators = Column(JSON)
    patterns = Column(JSON)
    sentiment_score = Column(Float)
    volume_analysis = Column(JSON)
    risk_score = Column(Float)
    reasoning = Column(Text)
    metadata = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime)
    
    def __repr__(self):
        return f"<TradingSignal {self.pair} {self.signal_type} {self.confidence}>"


class Prediction(Base):
    """Price prediction model."""
    
    __tablename__ = "predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pair = Column(String(20), nullable=False, index=True)
    model_type = Column(SQLEnum(ModelType), nullable=False)
    model_version = Column(String(50), nullable=False)
    current_price = Column(Float, nullable=False)
    predicted_price = Column(Float, nullable=False)
    prediction_horizon = Column(String(20))  # e.g., "1h", "24h", "7d"
    confidence = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    features_used = Column(JSON)
    model_metrics = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    predicted_at = Column(DateTime, nullable=False)
    actual_price = Column(Float)
    error = Column(Float)
    
    def __repr__(self):
        return f"<Prediction {self.pair} {self.predicted_price}>"


class MarketAnalysis(Base):
    """Market analysis results."""
    
    __tablename__ = "market_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pair = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(20), nullable=False)
    trend = Column(String(20))
    trend_strength = Column(Float)
    volatility = Column(Float)
    volume_profile = Column(JSON)
    support_levels = Column(JSON)
    resistance_levels = Column(JSON)
    market_regime = Column(String(50))
    sentiment_score = Column(Float)
    sentiment_sources = Column(JSON)
    technical_indicators = Column(JSON)
    pattern_analysis = Column(JSON)
    anomalies = Column(JSON)
    summary = Column(Text)
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<MarketAnalysis {self.pair} {self.trend}>"


class PortfolioAnalysis(Base):
    """Portfolio analysis results."""
    
    __tablename__ = "portfolio_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(100), nullable=False, index=True)
    portfolio_value = Column(Float, nullable=False)
    total_return = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    volatility = Column(Float)
    beta = Column(Float)
    alpha = Column(Float)
    diversification_score = Column(Float)
    risk_score = Column(Float)
    risk_level = Column(String(20))
    asset_allocation = Column(JSON)
    recommendations = Column(JSON)
    rebalancing_suggestions = Column(JSON)
    tax_optimization = Column(JSON)
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<PortfolioAnalysis {self.user_id} {self.risk_level}>"


class AIModel(Base):
    """AI model metadata and versioning."""
    
    __tablename__ = "ai_models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    model_type = Column(SQLEnum(ModelType), nullable=False)
    version = Column(String(50), nullable=False, index=True)
    description = Column(Text)
    framework = Column(String(50))
    architecture = Column(JSON)
    hyperparameters = Column(JSON)
    training_data_size = Column(Integer)
    training_duration = Column(Float)
    metrics = Column(JSON)
    performance_score = Column(Float)
    is_active = Column(Boolean, default=True)
    is_champion = Column(Boolean, default=False)
    ab_test_group = Column(String(10))
    ab_test_traffic = Column(Float)
    file_path = Column(String(500))
    mlflow_run_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deployed_at = Column(DateTime)
    retired_at = Column(DateTime)
    
    def __repr__(self):
        return f"<AIModel {self.name} v{self.version}>"


class ModelPredictionLog(Base):
    """Log of model predictions for monitoring."""
    
    __tablename__ = "model_prediction_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    pair = Column(String(20), nullable=False)
    input_features = Column(JSON)
    prediction = Column(JSON)
    confidence = Column(Float)
    latency_ms = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<ModelPredictionLog {self.model_version}>"


class BacktestResult(Base):
    """Backtesting results."""
    
    __tablename__ = "backtest_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_name = Column(String(100), nullable=False)
    model_version = Column(String(50))
    pair = Column(String(20), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    initial_capital = Column(Float, nullable=False)
    final_capital = Column(Float, nullable=False)
    total_return = Column(Float)
    annual_return = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    win_rate = Column(Float)
    total_trades = Column(Integer)
    winning_trades = Column(Integer)
    losing_trades = Column(Integer)
    avg_win = Column(Float)
    avg_loss = Column(Float)
    profit_factor = Column(Float)
    parameters = Column(JSON)
    trades = Column(JSON)
    equity_curve = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<BacktestResult {self.strategy_name} {self.total_return}%>"
