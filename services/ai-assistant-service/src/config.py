"""Application configuration."""
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings."""

    # Server
    service_name: str = Field(default="ai-assistant", alias="SERVICE_NAME")
    port: int = Field(default=8005, alias="PORT")
    host: str = Field(default="0.0.0.0", alias="HOST")
    env: str = Field(default="development", alias="ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # PostgreSQL
    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="ai_assistant_db", alias="POSTGRES_DB")
    postgres_user: str = Field(default="postgres", alias="POSTGRES_USER")
    postgres_password: str = Field(default="postgres", alias="POSTGRES_PASSWORD")

    # MongoDB
    mongodb_uri: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URI")
    mongodb_db: str = Field(default="ai_assistant", alias="MONGODB_DB")
    mongodb_user: Optional[str] = Field(default=None, alias="MONGODB_USER")
    mongodb_password: Optional[str] = Field(default=None, alias="MONGODB_PASSWORD")

    # Redis
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_db: int = Field(default=0, alias="REDIS_DB")
    redis_password: Optional[str] = Field(default=None, alias="REDIS_PASSWORD")

    # Claude API
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    claude_model: str = Field(default="claude-3-sonnet-20240229", alias="CLAUDE_MODEL")
    max_tokens: int = Field(default=4096, alias="MAX_TOKENS")

    # External Services
    market_data_service_url: str = Field(
        default="http://localhost:3005",
        alias="MARKET_DATA_SERVICE_URL"
    )
    auth_service_url: str = Field(
        default="http://localhost:3001",
        alias="AUTH_SERVICE_URL"
    )
    jwt_secret: str = Field(default="secret", alias="JWT_SECRET")

    # Model Configuration
    model_version: str = Field(default="1.0.0", alias="MODEL_VERSION")
    enable_ab_testing: bool = Field(default=True, alias="ENABLE_AB_TESTING")
    ab_test_split: float = Field(default=0.5, alias="AB_TEST_SPLIT")

    # Model Paths
    lstm_model_path: str = Field(default="./models/lstm", alias="LSTM_MODEL_PATH")
    sentiment_model_path: str = Field(default="./models/sentiment", alias="SENTIMENT_MODEL_PATH")
    pattern_model_path: str = Field(default="./models/pattern", alias="PATTERN_MODEL_PATH")

    # MLflow
    mlflow_tracking_uri: str = Field(default="http://localhost:5000", alias="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = Field(default="trading_ai", alias="MLFLOW_EXPERIMENT_NAME")

    # Trading Signals
    signal_confidence_threshold: float = Field(default=0.7, alias="SIGNAL_CONFIDENCE_THRESHOLD")
    rsi_period: int = Field(default=14, alias="RSI_PERIOD")
    macd_fast: int = Field(default=12, alias="MACD_FAST")
    macd_slow: int = Field(default=26, alias="MACD_SLOW")
    macd_signal: int = Field(default=9, alias="MACD_SIGNAL")
    bb_period: int = Field(default=20, alias="BB_PERIOD")
    bb_std: float = Field(default=2.0, alias="BB_STD")

    # Risk Management
    max_position_size: float = Field(default=0.1, alias="MAX_POSITION_SIZE")
    max_leverage: float = Field(default=3.0, alias="MAX_LEVERAGE")
    stop_loss_pct: float = Field(default=0.02, alias="STOP_LOSS_PCT")
    take_profit_pct: float = Field(default=0.05, alias="TAKE_PROFIT_PCT")

    # WebSocket
    ws_heartbeat_interval: int = Field(default=30, alias="WS_HEARTBEAT_INTERVAL")
    ws_max_connections: int = Field(default=1000, alias="WS_MAX_CONNECTIONS")

    # Cache
    cache_ttl: int = Field(default=300, alias="CACHE_TTL")
    signal_cache_ttl: int = Field(default=60, alias="SIGNAL_CACHE_TTL")
    prediction_cache_ttl: int = Field(default=180, alias="PREDICTION_CACHE_TTL")

    # Backtesting
    backtest_initial_capital: float = Field(default=10000, alias="BACKTEST_INITIAL_CAPITAL")
    backtest_commission: float = Field(default=0.001, alias="BACKTEST_COMMISSION")

    # Continuous Learning
    retrain_interval_hours: int = Field(default=24, alias="RETRAIN_INTERVAL_HOURS")
    min_samples_for_retrain: int = Field(default=1000, alias="MIN_SAMPLES_FOR_RETRAIN")
    model_performance_threshold: float = Field(default=0.6, alias="MODEL_PERFORMANCE_THRESHOLD")

    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_url_sync(self) -> str:
        """Get synchronous PostgreSQL connection URL."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def mongodb_url(self) -> str:
        """Get MongoDB connection URL."""
        if self.mongodb_user and self.mongodb_password:
            return f"{self.mongodb_uri.replace('mongodb://', f'mongodb://{self.mongodb_user}:{self.mongodb_password}@')}"
        return self.mongodb_uri

    class Config:
        env_file = ".env"
        case_sensitive = False


# Create global settings instance
settings = Settings()
