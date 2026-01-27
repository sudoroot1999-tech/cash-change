"""Trading signals API endpoints."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from typing import List, Optional
from datetime import datetime, timedelta
import structlog
import time

from src.schemas import TradingSignalResponse, SignalFilters
from src.models import TradingSignal, SignalType, SignalSource
from src.services.technical_analysis import TechnicalAnalyzer
from src.services.pattern_recognition import PatternRecognizer
from src.services.sentiment_analysis import SentimentAnalyzer
from src.services.lstm_model import LSTMPredictor
from src.services.market_data import MarketDataService
from src.database import get_db, RedisClient
from src.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/ai/signals", tags=["Trading Signals"])


@router.get("/{pair}", response_model=List[TradingSignalResponse])
async def get_signals(
    pair: str,
    signal_type: Optional[SignalType] = None,
    signal_source: Optional[SignalSource] = None,
    min_confidence: float = Query(default=0.0, ge=0.0, le=1.0),
    limit: int = Query(default=10, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get trading signals for a specific pair.
    
    Returns signals filtered by type, source, and confidence.
    """
    try:
        # Build query
        query = select(TradingSignal).where(
            and_(
                TradingSignal.pair == pair,
                TradingSignal.is_active == True,
                TradingSignal.confidence >= min_confidence
            )
        )
        
        if signal_type:
            query = query.where(TradingSignal.signal_type == signal_type)
        
        if signal_source:
            query = query.where(TradingSignal.signal_source == signal_source)
        
        query = query.order_by(desc(TradingSignal.created_at)).limit(limit)
        
        result = await db.execute(query)
        signals = result.scalars().all()
        
        return [
            TradingSignalResponse(
                id=str(signal.id),
                pair=signal.pair,
                signal_type=signal.signal_type,
                signal_source=signal.signal_source,
                confidence=signal.confidence,
                price=signal.price,
                target_price=signal.target_price,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit,
                indicators=signal.indicators,
                patterns=signal.patterns,
                sentiment_score=signal.sentiment_score,
                risk_score=signal.risk_score,
                reasoning=signal.reasoning,
                created_at=signal.created_at,
                expires_at=signal.expires_at
            )
            for signal in signals
        ]
    
    except Exception as e:
        logger.error("Failed to get signals", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{pair}/generate")
async def generate_signal(
    pair: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate new trading signal for a pair.
    
    Analyzes technical indicators, patterns, and sentiment to create comprehensive signal.
    """
    try:
        start_time = time.time()
        
        # Fetch market data
        market_service = MarketDataService()
        df = await market_service.get_ohlcv(pair, timeframe="1h", limit=200)
        current_price = await market_service.get_current_price(pair)
        
        # Technical analysis
        tech_analyzer = TechnicalAnalyzer(
            rsi_period=settings.rsi_period,
            macd_fast=settings.macd_fast,
            macd_slow=settings.macd_slow,
            macd_signal=settings.macd_signal,
            bb_period=settings.bb_period,
            bb_std=settings.bb_std
        )
        tech_analysis = tech_analyzer.analyze(df)
        
        # Pattern recognition
        pattern_recognizer = PatternRecognizer()
        patterns = pattern_recognizer.detect_all_patterns(df)
        pattern_signal = pattern_recognizer.get_pattern_signal(patterns)
        
        # Sentiment analysis
        sentiment_analyzer = SentimentAnalyzer()
        news = await market_service.search_news(pair, limit=10)
        social = await market_service.search_social_media(pair, limit=50)
        sentiment = sentiment_analyzer.get_market_sentiment(pair, news, social)
        
        # Combine signals
        tech_signal = tech_analysis['signals']
        
        # Weight different sources
        signal_score = (
            tech_signal['score'] * 0.4 +
            pattern_signal['confidence'] * (1 if pattern_signal['signal_type'] == 'buy' else -1 if pattern_signal['signal_type'] == 'sell' else 0) * 0.3 +
            sentiment['overall_score'] * 0.3
        )
        
        # Determine final signal
        if signal_score > 0.5:
            signal_type = SignalType.BUY
        elif signal_score < -0.5:
            signal_type = SignalType.SELL
        else:
            signal_type = SignalType.HOLD
        
        confidence = min(abs(signal_score), 1.0)
        
        # Calculate target and stop loss
        atr = tech_analysis['indicators'].get('atr', current_price * 0.02)
        
        if signal_type == SignalType.BUY:
            stop_loss = current_price - (atr * 2)
            take_profit = current_price + (atr * 3)
        elif signal_type == SignalType.SELL:
            stop_loss = current_price + (atr * 2)
            take_profit = current_price - (atr * 3)
        else:
            stop_loss = None
            take_profit = None
        
        # Calculate risk score
        volatility = tech_analysis['indicators'].get('atr', 0) / current_price
        risk_score = min(volatility * 10, 1.0)
        
        # Create reasoning
        reasoning = f"Technical: {tech_signal['signal_type']} ({tech_signal['confidence']:.0%}), "
        reasoning += f"Patterns: {pattern_signal['signal_type']} ({pattern_signal['confidence']:.0%}), "
        reasoning += f"Sentiment: {sentiment['overall_sentiment']} ({sentiment['confidence']:.0%})"
        
        # Save signal
        signal = TradingSignal(
            pair=pair,
            signal_type=signal_type,
            signal_source=SignalSource.COMBINED,
            confidence=confidence,
            price=current_price,
            target_price=take_profit,
            stop_loss=stop_loss,
            take_profit=take_profit,
            indicators=tech_analysis['indicators'],
            patterns=patterns,
            sentiment_score=sentiment['overall_score'],
            risk_score=risk_score,
            reasoning=reasoning,
            metadata={
                'technical': tech_signal,
                'pattern': pattern_signal,
                'sentiment': sentiment,
                'generation_time_ms': (time.time() - start_time) * 1000
            },
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        
        db.add(signal)
        await db.commit()
        await db.refresh(signal)
        
        logger.info("Signal generated", 
                   pair=pair, 
                   signal_type=signal_type.value,
                   confidence=confidence)
        
        return TradingSignalResponse(
            id=str(signal.id),
            pair=signal.pair,
            signal_type=signal.signal_type,
            signal_source=signal.signal_source,
            confidence=signal.confidence,
            price=signal.price,
            target_price=signal.target_price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            indicators=signal.indicators,
            patterns=signal.patterns,
            sentiment_score=signal.sentiment_score,
            risk_score=signal.risk_score,
            reasoning=signal.reasoning,
            created_at=signal.created_at,
            expires_at=signal.expires_at
        )
    
    except Exception as e:
        logger.error("Signal generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
