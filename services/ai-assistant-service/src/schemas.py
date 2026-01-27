"""Pydantic schemas for API requests and responses."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from enum import Enum


class SignalTypeEnum(str, Enum):
    """Trading signal types."""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class SignalSourceEnum(str, Enum):
    """Signal source types."""
    TECHNICAL = "technical"
    SENTIMENT = "sentiment"
    AI_MODEL = "ai_model"
    PATTERN = "pattern"
    COMBINED = "combined"


class ModelTypeEnum(str, Enum):
    """AI model types."""
    LSTM = "lstm"
    TRANSFORMER = "transformer"
    SENTIMENT = "sentiment"
    CLASSIFICATION = "classification"
    REINFORCEMENT = "reinforcement"


# Chat Schemas
class ChatMessage(BaseModel):
    """Chat message schema."""
    message: str = Field(..., min_length=1, max_length=5000)
    user_id: str = Field(..., min_length=1)
    context: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response schema."""
    response: str
    conversation_id: str
    confidence: float
    suggested_actions: Optional[List[str]] = None
    related_signals: Optional[List[str]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Trading Signal Schemas
class TradingSignalResponse(BaseModel):
    """Trading signal response."""
    id: str
    pair: str
    signal_type: SignalTypeEnum
    signal_source: SignalSourceEnum
    confidence: float
    price: float
    target_price: Optional[float]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    indicators: Optional[Dict[str, Any]]
    patterns: Optional[Dict[str, Any]]
    sentiment_score: Optional[float]
    risk_score: Optional[float]
    reasoning: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SignalFilters(BaseModel):
    """Filters for signal queries."""
    signal_type: Optional[SignalTypeEnum] = None
    signal_source: Optional[SignalSourceEnum] = None
    min_confidence: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    timeframe: Optional[str] = None


# Market Analysis Schemas
class MarketAnalysisResponse(BaseModel):
    """Market analysis response."""
    pair: str
    timeframe: str
    trend: Optional[str]
    trend_strength: Optional[float]
    volatility: Optional[float]
    support_levels: Optional[List[float]]
    resistance_levels: Optional[List[float]]
    market_regime: Optional[str]
    sentiment_score: Optional[float]
    technical_indicators: Optional[Dict[str, Any]]
    pattern_analysis: Optional[Dict[str, Any]]
    anomalies: Optional[List[Dict[str, Any]]]
    summary: Optional[str]
    recommendations: Optional[List[str]]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Portfolio Analysis Schemas
class Asset(BaseModel):
    """Asset in portfolio."""
    symbol: str
    quantity: float
    current_price: Optional[float] = None


class PortfolioAnalysisRequest(BaseModel):
    """Portfolio analysis request."""
    user_id: str
    assets: List[Asset]
    risk_tolerance: Optional[str] = Field(default="moderate")  # conservative, moderate, aggressive
    investment_horizon: Optional[str] = Field(default="medium")  # short, medium, long
    objectives: Optional[List[str]] = None


class PortfolioAnalysisResponse(BaseModel):
    """Portfolio analysis response."""
    id: str
    portfolio_value: float
    total_return: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]
    volatility: Optional[float]
    diversification_score: Optional[float]
    risk_score: Optional[float]
    risk_level: Optional[str]
    asset_allocation: Optional[Dict[str, float]]
    recommendations: Optional[List[str]]
    rebalancing_suggestions: Optional[List[Dict[str, Any]]]
    summary: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Prediction Schemas
class PredictionResponse(BaseModel):
    """Price prediction response."""
    id: str
    pair: str
    model_type: ModelTypeEnum
    model_version: str
    current_price: float
    predicted_price: float
    prediction_horizon: Optional[str]
    confidence: float
    lower_bound: Optional[float]
    upper_bound: Optional[float]
    created_at: datetime
    predicted_at: datetime
    
    class Config:
        from_attributes = True


class PredictionRequest(BaseModel):
    """Prediction request."""
    pair: str
    horizon: str = Field(default="24h", pattern=r"^\d+[hdwm]$")  # e.g., 1h, 24h, 7d
    model_type: Optional[ModelTypeEnum] = None


# Backtesting Schemas
class BacktestRequest(BaseModel):
    """Backtest request."""
    strategy_name: str
    pair: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(default=10000, gt=0)
    parameters: Optional[Dict[str, Any]] = None


class BacktestResponse(BaseModel):
    """Backtest response."""
    id: str
    strategy_name: str
    pair: str
    initial_capital: float
    final_capital: float
    total_return: float
    annual_return: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]
    win_rate: Optional[float]
    total_trades: int
    profit_factor: Optional[float]
    equity_curve: Optional[List[Dict[str, Any]]]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Model Management Schemas
class ModelInfo(BaseModel):
    """AI model information."""
    id: str
    name: str
    model_type: ModelTypeEnum
    version: str
    description: Optional[str]
    metrics: Optional[Dict[str, Any]]
    performance_score: Optional[float]
    is_active: bool
    is_champion: bool
    ab_test_group: Optional[str]
    created_at: datetime
    deployed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ModelDeployRequest(BaseModel):
    """Model deployment request."""
    model_id: str
    ab_test_traffic: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    replace_champion: bool = Field(default=False)


# WebSocket Schemas
class WSMessage(BaseModel):
    """WebSocket message."""
    type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WSSubscription(BaseModel):
    """WebSocket subscription."""
    pairs: List[str]
    signal_types: Optional[List[SignalTypeEnum]] = None
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)


# Health Check
class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: datetime
    databases: Dict[str, str]
    models: Dict[str, str]


# Error Response
class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
