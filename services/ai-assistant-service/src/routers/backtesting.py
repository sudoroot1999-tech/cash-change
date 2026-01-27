"""Backtesting endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
import structlog

from src.schemas import BacktestRequest, BacktestResponse
from src.models import BacktestResult
from src.services.backtesting import BacktestEngine
from src.services.market_data import MarketDataService
from src.database import get_db
from src.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/ai/backtest", tags=["Backtesting"])


@router.post("", response_model=BacktestResponse)
async def run_backtest(
    request: BacktestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Run backtest for a trading strategy.
    
    Tests strategy performance on historical data.
    """
    try:
        # Fetch historical data
        market_service = MarketDataService()
        
        # Calculate required candles based on date range
        days = (request.end_date - request.start_date).days
        limit = min(days * 24, 10000)  # Assuming hourly data
        
        df = await market_service.get_ohlcv(
            request.pair,
            timeframe="1h",
            limit=limit
        )
        
        # Filter by date range
        df = df[
            (df['timestamp'] >= request.start_date) &
            (df['timestamp'] <= request.end_date)
        ]
        
        if len(df) < 10:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for backtesting"
            )
        
        # Initialize backtest engine
        engine = BacktestEngine(
            initial_capital=request.initial_capital,
            commission=settings.backtest_commission
        )
        
        # Run backtest
        if request.parameters:
            results = engine.run_strategy_backtest(
                df,
                request.strategy_name,
                **request.parameters
            )
        else:
            # Generate simple signals based on strategy name
            if request.strategy_name == 'buy_and_hold':
                import pandas as pd
                signals = pd.Series(0, index=df.index)
                signals.iloc[0] = 1  # Buy at start
            else:
                # Default RSI strategy
                results = engine.run_strategy_backtest(
                    df,
                    'rsi_mean_reversion',
                    rsi_period=14,
                    oversold=30,
                    overbought=70,
                    stop_loss_pct=settings.stop_loss_pct,
                    take_profit_pct=settings.take_profit_pct
                )
        
        # Save results
        backtest = BacktestResult(
            strategy_name=request.strategy_name,
            pair=request.pair,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=results['initial_capital'],
            final_capital=results['final_capital'],
            total_return=results['total_return'],
            annual_return=results.get('annual_return'),
            sharpe_ratio=results.get('sharpe_ratio'),
            sortino_ratio=results.get('sortino_ratio'),
            max_drawdown=results.get('max_drawdown'),
            win_rate=results.get('win_rate'),
            total_trades=results['total_trades'],
            winning_trades=results['winning_trades'],
            losing_trades=results['losing_trades'],
            avg_win=results.get('avg_win'),
            avg_loss=results.get('avg_loss'),
            profit_factor=results.get('profit_factor'),
            parameters=request.parameters,
            trades=results['trades'],
            equity_curve=results['equity_curve']
        )
        
        db.add(backtest)
        await db.commit()
        await db.refresh(backtest)
        
        logger.info("Backtest completed",
                   strategy=request.strategy_name,
                   total_return=results['total_return'],
                   total_trades=results['total_trades'])
        
        return BacktestResponse(
            id=str(backtest.id),
            strategy_name=backtest.strategy_name,
            pair=backtest.pair,
            initial_capital=backtest.initial_capital,
            final_capital=backtest.final_capital,
            total_return=backtest.total_return,
            annual_return=backtest.annual_return,
            sharpe_ratio=backtest.sharpe_ratio,
            max_drawdown=backtest.max_drawdown,
            win_rate=backtest.win_rate,
            total_trades=backtest.total_trades,
            profit_factor=backtest.profit_factor,
            equity_curve=backtest.equity_curve,
            created_at=backtest.created_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Backtest failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results", response_model=List[BacktestResponse])
async def get_backtest_results(
    strategy_name: str = None,
    pair: str = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get backtest results."""
    try:
        query = select(BacktestResult)
        
        if strategy_name:
            query = query.where(BacktestResult.strategy_name == strategy_name)
        
        if pair:
            query = query.where(BacktestResult.pair == pair)
        
        query = query.order_by(desc(BacktestResult.created_at)).limit(limit)
        
        result = await db.execute(query)
        backtests = result.scalars().all()
        
        return [
            BacktestResponse(
                id=str(b.id),
                strategy_name=b.strategy_name,
                pair=b.pair,
                initial_capital=b.initial_capital,
                final_capital=b.final_capital,
                total_return=b.total_return,
                annual_return=b.annual_return,
                sharpe_ratio=b.sharpe_ratio,
                max_drawdown=b.max_drawdown,
                win_rate=b.win_rate,
                total_trades=b.total_trades,
                profit_factor=b.profit_factor,
                equity_curve=b.equity_curve,
                created_at=b.created_at
            )
            for b in backtests
        ]
    
    except Exception as e:
        logger.error("Failed to get backtest results", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{backtest_id}", response_model=BacktestResponse)
async def get_backtest_detail(
    backtest_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed backtest results."""
    try:
        result = await db.execute(
            select(BacktestResult).where(BacktestResult.id == backtest_id)
        )
        backtest = result.scalar_one_or_none()
        
        if not backtest:
            raise HTTPException(status_code=404, detail="Backtest not found")
        
        return BacktestResponse(
            id=str(backtest.id),
            strategy_name=backtest.strategy_name,
            pair=backtest.pair,
            initial_capital=backtest.initial_capital,
            final_capital=backtest.final_capital,
            total_return=backtest.total_return,
            annual_return=backtest.annual_return,
            sharpe_ratio=backtest.sharpe_ratio,
            max_drawdown=backtest.max_drawdown,
            win_rate=backtest.win_rate,
            total_trades=backtest.total_trades,
            profit_factor=backtest.profit_factor,
            equity_curve=backtest.equity_curve,
            created_at=backtest.created_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get backtest detail", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
