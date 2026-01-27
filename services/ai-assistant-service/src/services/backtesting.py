"""Backtesting service for trading strategies."""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import structlog

from src.config import settings

logger = structlog.get_logger()


class BacktestEngine:
    """Backtesting engine for trading strategies."""
    
    def __init__(self, initial_capital: float = 10000, 
                 commission: float = 0.001):
        """
        Initialize backtesting engine.
        
        Args:
            initial_capital: Starting capital
            commission: Trading commission (0.001 = 0.1%)
        """
        self.initial_capital = initial_capital
        self.commission = commission
        self.trades = []
        self.equity_curve = []
        self.positions = []
    
    def run_backtest(self, df: pd.DataFrame, signals: pd.Series,
                    stop_loss_pct: Optional[float] = None,
                    take_profit_pct: Optional[float] = None) -> Dict:
        """
        Run backtest with given signals.
        
        Args:
            df: DataFrame with OHLCV data
            signals: Series with trading signals (1=buy, -1=sell, 0=hold)
            stop_loss_pct: Stop loss percentage
            take_profit_pct: Take profit percentage
        
        Returns:
            Backtest results
        """
        try:
            capital = self.initial_capital
            position = 0  # 0 = no position, 1 = long, -1 = short
            entry_price = 0
            shares = 0
            
            self.trades = []
            self.equity_curve = []
            
            for i in range(len(df)):
                current_price = df['close'].iloc[i]
                signal = signals.iloc[i] if i < len(signals) else 0
                
                # Check stop loss / take profit
                if position != 0 and entry_price > 0:
                    pnl_pct = (current_price - entry_price) / entry_price * position
                    
                    # Stop loss
                    if stop_loss_pct and pnl_pct <= -stop_loss_pct:
                        capital, position, shares = self._close_position(
                            capital, position, shares, current_price, 
                            df['timestamp'].iloc[i], 'stop_loss'
                        )
                        entry_price = 0
                        continue
                    
                    # Take profit
                    if take_profit_pct and pnl_pct >= take_profit_pct:
                        capital, position, shares = self._close_position(
                            capital, position, shares, current_price,
                            df['timestamp'].iloc[i], 'take_profit'
                        )
                        entry_price = 0
                        continue
                
                # Process signals
                if signal == 1 and position != 1:  # Buy signal
                    # Close short if exists
                    if position == -1:
                        capital, position, shares = self._close_position(
                            capital, position, shares, current_price,
                            df['timestamp'].iloc[i], 'signal'
                        )
                    
                    # Open long
                    position, shares, entry_price = self._open_position(
                        capital, current_price, 1,
                        df['timestamp'].iloc[i]
                    )
                
                elif signal == -1 and position != -1:  # Sell signal
                    # Close long if exists
                    if position == 1:
                        capital, position, shares = self._close_position(
                            capital, position, shares, current_price,
                            df['timestamp'].iloc[i], 'signal'
                        )
                    
                    # Open short
                    position, shares, entry_price = self._open_position(
                        capital, current_price, -1,
                        df['timestamp'].iloc[i]
                    )
                
                # Calculate current equity
                if position != 0:
                    unrealized_pnl = (current_price - entry_price) * shares * position
                    current_equity = capital + unrealized_pnl
                else:
                    current_equity = capital
                
                self.equity_curve.append({
                    'timestamp': df['timestamp'].iloc[i],
                    'equity': current_equity,
                    'position': position
                })
            
            # Close any remaining position
            if position != 0:
                capital, position, shares = self._close_position(
                    capital, position, shares, df['close'].iloc[-1],
                    df['timestamp'].iloc[-1], 'backtest_end'
                )
            
            # Calculate metrics
            metrics = self._calculate_metrics(df)
            
            return metrics
        
        except Exception as e:
            logger.error("Backtest failed", error=str(e))
            raise
    
    def _open_position(self, capital: float, price: float, 
                      direction: int, timestamp) -> Tuple[int, float, float]:
        """Open a new position."""
        # Use 95% of capital (keep some for commission)
        position_size = capital * 0.95
        shares = position_size / price
        commission = position_size * self.commission
        
        self.trades.append({
            'timestamp': timestamp,
            'type': 'open',
            'direction': 'long' if direction == 1 else 'short',
            'price': price,
            'shares': shares,
            'commission': commission
        })
        
        return direction, shares, price
    
    def _close_position(self, capital: float, position: int, 
                       shares: float, price: float, 
                       timestamp, reason: str) -> Tuple[float, int, float]:
        """Close current position."""
        # Calculate P&L
        entry_trade = next((t for t in reversed(self.trades) if t['type'] == 'open'), None)
        
        if entry_trade:
            entry_price = entry_trade['price']
            pnl = (price - entry_price) * shares * position
            commission = price * shares * self.commission
            
            net_pnl = pnl - commission - entry_trade['commission']
            capital += net_pnl
            
            pnl_pct = (pnl / (entry_price * shares)) * 100
            
            self.trades.append({
                'timestamp': timestamp,
                'type': 'close',
                'price': price,
                'shares': shares,
                'pnl': net_pnl,
                'pnl_pct': pnl_pct,
                'commission': commission,
                'reason': reason
            })
        
        return capital, 0, 0
    
    def _calculate_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate performance metrics."""
        final_capital = self.equity_curve[-1]['equity'] if self.equity_curve else self.initial_capital
        
        # Basic metrics
        total_return = ((final_capital - self.initial_capital) / self.initial_capital) * 100
        
        # Trade statistics
        closed_trades = [t for t in self.trades if t['type'] == 'close']
        winning_trades = [t for t in closed_trades if t.get('pnl', 0) > 0]
        losing_trades = [t for t in closed_trades if t.get('pnl', 0) <= 0]
        
        total_trades = len(closed_trades)
        win_rate = (len(winning_trades) / total_trades * 100) if total_trades > 0 else 0
        
        avg_win = np.mean([t['pnl'] for t in winning_trades]) if winning_trades else 0
        avg_loss = np.mean([t['pnl'] for t in losing_trades]) if losing_trades else 0
        
        profit_factor = abs(avg_win * len(winning_trades) / (avg_loss * len(losing_trades))) \
                       if losing_trades and avg_loss != 0 else 0
        
        # Equity curve analysis
        equity_values = [e['equity'] for e in self.equity_curve]
        returns = pd.Series(equity_values).pct_change().dropna()
        
        # Sharpe ratio (assuming 252 trading days)
        sharpe_ratio = (returns.mean() / returns.std() * np.sqrt(252)) if len(returns) > 0 and returns.std() > 0 else 0
        
        # Sortino ratio (downside deviation)
        downside_returns = returns[returns < 0]
        sortino_ratio = (returns.mean() / downside_returns.std() * np.sqrt(252)) \
                       if len(downside_returns) > 0 and downside_returns.std() > 0 else 0
        
        # Maximum drawdown
        cummax = pd.Series(equity_values).cummax()
        drawdown = (pd.Series(equity_values) - cummax) / cummax * 100
        max_drawdown = drawdown.min()
        
        # Annual return (assuming data covers full period)
        days = (df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]).days
        annual_return = (total_return / days * 365) if days > 0 else 0
        
        return {
            'initial_capital': self.initial_capital,
            'final_capital': final_capital,
            'total_return': round(total_return, 2),
            'annual_return': round(annual_return, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'sortino_ratio': round(sortino_ratio, 2),
            'max_drawdown': round(max_drawdown, 2),
            'win_rate': round(win_rate, 2),
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'profit_factor': round(profit_factor, 2),
            'equity_curve': self.equity_curve,
            'trades': self.trades
        }
    
    def run_strategy_backtest(self, df: pd.DataFrame, 
                             strategy: str, **params) -> Dict:
        """
        Run backtest for a named strategy.
        
        Args:
            df: OHLCV data
            strategy: Strategy name
            params: Strategy parameters
        
        Returns:
            Backtest results
        """
        try:
            if strategy == 'rsi_mean_reversion':
                signals = self._rsi_strategy(df, **params)
            elif strategy == 'macd_crossover':
                signals = self._macd_strategy(df, **params)
            elif strategy == 'bollinger_breakout':
                signals = self._bollinger_strategy(df, **params)
            else:
                raise ValueError(f"Unknown strategy: {strategy}")
            
            return self.run_backtest(df, signals,
                                   stop_loss_pct=params.get('stop_loss_pct'),
                                   take_profit_pct=params.get('take_profit_pct'))
        
        except Exception as e:
            logger.error("Strategy backtest failed", error=str(e))
            raise
    
    def _rsi_strategy(self, df: pd.DataFrame, 
                     rsi_period: int = 14,
                     oversold: int = 30,
                     overbought: int = 70, **kwargs) -> pd.Series:
        """RSI mean reversion strategy."""
        from src.services.technical_analysis import TechnicalAnalyzer
        
        analyzer = TechnicalAnalyzer(rsi_period=rsi_period)
        rsi = analyzer.calculate_rsi(df['close'])
        
        signals = pd.Series(0, index=df.index)
        signals[rsi < oversold] = 1  # Buy when oversold
        signals[rsi > overbought] = -1  # Sell when overbought
        
        return signals
    
    def _macd_strategy(self, df: pd.DataFrame,
                      fast: int = 12, slow: int = 26, 
                      signal: int = 9, **kwargs) -> pd.Series:
        """MACD crossover strategy."""
        from src.services.technical_analysis import TechnicalAnalyzer
        
        analyzer = TechnicalAnalyzer(macd_fast=fast, macd_slow=slow, macd_signal=signal)
        macd, macd_signal, macd_hist = analyzer.calculate_macd(df['close'])
        
        signals = pd.Series(0, index=df.index)
        signals[macd > macd_signal] = 1  # Buy when MACD crosses above signal
        signals[macd < macd_signal] = -1  # Sell when MACD crosses below signal
        
        return signals
    
    def _bollinger_strategy(self, df: pd.DataFrame,
                           period: int = 20, std: float = 2.0,
                           **kwargs) -> pd.Series:
        """Bollinger Bands breakout strategy."""
        from src.services.technical_analysis import TechnicalAnalyzer
        
        analyzer = TechnicalAnalyzer(bb_period=period, bb_std=std)
        bb_upper, bb_middle, bb_lower = analyzer.calculate_bollinger_bands(df['close'])
        
        signals = pd.Series(0, index=df.index)
        signals[df['close'] < bb_lower] = 1  # Buy at lower band
        signals[df['close'] > bb_upper] = -1  # Sell at upper band
        
        return signals
