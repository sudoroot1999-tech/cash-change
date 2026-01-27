"""Market and portfolio analysis endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import structlog

from src.schemas import (
    MarketAnalysisResponse, PortfolioAnalysisRequest, 
    PortfolioAnalysisResponse
)
from src.models import MarketAnalysis, PortfolioAnalysis
from src.services.technical_analysis import TechnicalAnalyzer
from src.services.pattern_recognition import PatternRecognizer
from src.services.sentiment_analysis import SentimentAnalyzer
from src.services.claude_service import ClaudeService
from src.services.market_data import MarketDataService
from src.database import get_db
from src.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/ai", tags=["Analysis"])


@router.get("/market-analysis/{pair}", response_model=MarketAnalysisResponse)
async def get_market_analysis(
    pair: str,
    timeframe: str = "1h",
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive market analysis for a trading pair.
    
    Includes technical indicators, patterns, sentiment, and AI insights.
    """
    try:
        # Fetch market data
        market_service = MarketDataService()
        df = await market_service.get_ohlcv(pair, timeframe=timeframe, limit=200)
        
        # Technical analysis
        tech_analyzer = TechnicalAnalyzer()
        tech_analysis = tech_analyzer.analyze(df)
        
        # Pattern recognition
        pattern_recognizer = PatternRecognizer()
        patterns = pattern_recognizer.detect_all_patterns(df)
        
        # Sentiment analysis
        sentiment_analyzer = SentimentAnalyzer()
        news = await market_service.search_news(pair, limit=20)
        social = await market_service.search_social_media(pair, limit=100)
        sentiment = sentiment_analyzer.get_market_sentiment(pair, news, social)
        
        # Detect anomalies
        # Get historical sentiment for anomaly detection
        historical_sentiments = [
            {'score': sentiment['overall_score'], 'timestamp': sentiment['timestamp']}
        ]
        anomalies = sentiment_analyzer.detect_anomalies(historical_sentiments)
        
        # Determine trend
        ema_20 = tech_analysis['indicators'].get('ema_20')
        ema_50 = tech_analysis['indicators'].get('ema_50')
        current_price = tech_analysis['current_price']
        
        if ema_20 and ema_50:
            if current_price > ema_20 > ema_50:
                trend = "strong_uptrend"
                trend_strength = 0.8
            elif current_price > ema_20:
                trend = "uptrend"
                trend_strength = 0.6
            elif current_price < ema_20 < ema_50:
                trend = "strong_downtrend"
                trend_strength = 0.8
            elif current_price < ema_20:
                trend = "downtrend"
                trend_strength = 0.6
            else:
                trend = "sideways"
                trend_strength = 0.3
        else:
            trend = "unknown"
            trend_strength = 0.0
        
        # Market regime detection
        adx = tech_analysis['indicators'].get('adx', 0)
        if adx > 25:
            market_regime = "trending"
        elif adx < 20:
            market_regime = "ranging"
        else:
            market_regime = "transitional"
        
        # Calculate volatility
        atr = tech_analysis['indicators'].get('atr', 0)
        volatility = atr / current_price if current_price > 0 else 0
        
        # Get AI insights
        claude_service = ClaudeService()
        insights_data = {
            'indicators': tech_analysis['indicators'],
            'patterns': patterns,
            'sentiment': sentiment,
            'support_levels': tech_analysis['support_levels'],
            'resistance_levels': tech_analysis['resistance_levels']
        }
        summary = await claude_service.get_market_insights(pair, insights_data)
        
        # Generate recommendations
        recommendations = []
        signal = tech_analysis['signals']
        
        if signal['signal_type'] == 'buy' and signal['confidence'] > 0.7:
            recommendations.append(f"Strong buy signal detected (confidence: {signal['confidence']:.0%})")
        elif signal['signal_type'] == 'sell' and signal['confidence'] > 0.7:
            recommendations.append(f"Strong sell signal detected (confidence: {signal['confidence']:.0%})")
        
        if sentiment['overall_sentiment'] == 'bullish':
            recommendations.append("Positive market sentiment")
        elif sentiment['overall_sentiment'] == 'bearish':
            recommendations.append("Negative market sentiment - exercise caution")
        
        if volatility > 0.05:
            recommendations.append("High volatility - use wider stop losses")
        
        # Save analysis
        analysis = MarketAnalysis(
            pair=pair,
            timeframe=timeframe,
            trend=trend,
            trend_strength=trend_strength,
            volatility=volatility,
            support_levels=tech_analysis['support_levels'],
            resistance_levels=tech_analysis['resistance_levels'],
            market_regime=market_regime,
            sentiment_score=sentiment['overall_score'],
            sentiment_sources={'news': len(news), 'social': len(social)},
            technical_indicators=tech_analysis['indicators'],
            pattern_analysis={'patterns': patterns, 'signal': tech_analysis['signals']},
            anomalies=anomalies,
            summary=summary,
            recommendations=recommendations
        )
        
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        
        return MarketAnalysisResponse(
            pair=analysis.pair,
            timeframe=analysis.timeframe,
            trend=analysis.trend,
            trend_strength=analysis.trend_strength,
            volatility=analysis.volatility,
            support_levels=analysis.support_levels,
            resistance_levels=analysis.resistance_levels,
            market_regime=analysis.market_regime,
            sentiment_score=analysis.sentiment_score,
            technical_indicators=analysis.technical_indicators,
            pattern_analysis=analysis.pattern_analysis,
            anomalies=analysis.anomalies,
            summary=analysis.summary,
            recommendations=analysis.recommendations,
            created_at=analysis.created_at
        )
    
    except Exception as e:
        logger.error("Market analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-portfolio", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(
    request: PortfolioAnalysisRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze user's portfolio and provide recommendations.
    
    Calculates risk metrics, diversification, and provides AI-powered suggestions.
    """
    try:
        import numpy as np
        
        # Fetch current prices for all assets
        market_service = MarketDataService()
        
        portfolio_value = 0.0
        asset_values = {}
        
        for asset in request.assets:
            if asset.current_price:
                price = asset.current_price
            else:
                price = await market_service.get_current_price(asset.symbol)
            
            value = asset.quantity * price
            asset_values[asset.symbol] = value
            portfolio_value += value
        
        # Calculate asset allocation
        asset_allocation = {
            symbol: (value / portfolio_value * 100) if portfolio_value > 0 else 0
            for symbol, value in asset_values.items()
        }
        
        # Fetch historical data for risk metrics
        returns_data = []
        for asset in request.assets:
            try:
                df = await market_service.get_ohlcv(asset.symbol, limit=30)
                returns = df['close'].pct_change().dropna()
                returns_data.append(returns)
            except:
                continue
        
        # Calculate portfolio metrics
        if returns_data:
            # Weighted returns
            weights = np.array([asset_allocation.get(asset.symbol, 0) / 100 for asset in request.assets])
            portfolio_returns = sum(ret * w for ret, w in zip(returns_data, weights))
            
            # Volatility
            volatility = float(portfolio_returns.std() * np.sqrt(365))
            
            # Sharpe ratio (assuming 2% risk-free rate)
            mean_return = float(portfolio_returns.mean() * 365)
            sharpe_ratio = (mean_return - 0.02) / volatility if volatility > 0 else 0
            
            # Sortino ratio
            downside_returns = portfolio_returns[portfolio_returns < 0]
            downside_std = float(downside_returns.std() * np.sqrt(365)) if len(downside_returns) > 0 else 0
            sortino_ratio = (mean_return - 0.02) / downside_std if downside_std > 0 else 0
            
            # Max drawdown
            cumulative = (1 + portfolio_returns).cumprod()
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            max_drawdown = float(drawdown.min())
        else:
            volatility = 0.0
            sharpe_ratio = 0.0
            sortino_ratio = 0.0
            max_drawdown = 0.0
            mean_return = 0.0
        
        # Diversification score (based on number of assets and distribution)
        num_assets = len(request.assets)
        concentration = max(asset_allocation.values()) if asset_allocation else 0
        diversification_score = min((num_assets / 10) * (1 - concentration / 100), 1.0)
        
        # Risk score (0-10)
        risk_score = min(volatility * 10, 10.0)
        
        # Risk level
        if risk_score < 3:
            risk_level = "low"
        elif risk_score < 6:
            risk_level = "moderate"
        elif risk_score < 8:
            risk_level = "high"
        else:
            risk_level = "very_high"
        
        # Generate recommendations
        recommendations = []
        rebalancing_suggestions = []
        
        if diversification_score < 0.5:
            recommendations.append("Portfolio lacks diversification - consider adding more assets")
        
        if concentration > 50:
            top_asset = max(asset_allocation, key=asset_allocation.get)
            recommendations.append(f"High concentration in {top_asset} ({concentration:.1f}%) - consider rebalancing")
            rebalancing_suggestions.append({
                'asset': top_asset,
                'action': 'reduce',
                'target_allocation': 30.0
            })
        
        if risk_score > 7 and request.risk_tolerance == "conservative":
            recommendations.append("Portfolio risk too high for conservative profile - reduce exposure")
        
        if sharpe_ratio < 0.5:
            recommendations.append("Poor risk-adjusted returns - review asset selection")
        
        # Get AI insights
        claude_service = ClaudeService()
        portfolio_data = {
            'portfolio_value': portfolio_value,
            'total_return': mean_return * 100,
            'risk_score': risk_score,
            'asset_allocation': asset_allocation
        }
        user_preferences = {
            'risk_tolerance': request.risk_tolerance,
            'investment_horizon': request.investment_horizon,
            'objectives': request.objectives or []
        }
        ai_summary = await claude_service.analyze_portfolio(portfolio_data, user_preferences)
        
        # Save analysis
        analysis = PortfolioAnalysis(
            user_id=request.user_id,
            portfolio_value=portfolio_value,
            total_return=mean_return * 100,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_drawdown,
            volatility=volatility,
            diversification_score=diversification_score,
            risk_score=risk_score,
            risk_level=risk_level,
            asset_allocation=asset_allocation,
            recommendations=recommendations,
            rebalancing_suggestions=rebalancing_suggestions,
            summary=ai_summary
        )
        
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        
        return PortfolioAnalysisResponse(
            id=str(analysis.id),
            portfolio_value=analysis.portfolio_value,
            total_return=analysis.total_return,
            sharpe_ratio=analysis.sharpe_ratio,
            max_drawdown=analysis.max_drawdown,
            volatility=analysis.volatility,
            diversification_score=analysis.diversification_score,
            risk_score=analysis.risk_score,
            risk_level=analysis.risk_level,
            asset_allocation=analysis.asset_allocation,
            recommendations=analysis.recommendations,
            rebalancing_suggestions=analysis.rebalancing_suggestions,
            summary=analysis.summary,
            created_at=analysis.created_at
        )
    
    except Exception as e:
        logger.error("Portfolio analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
