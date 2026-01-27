"""Technical analysis indicators and signal generation."""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import structlog

logger = structlog.get_logger()


class TechnicalAnalyzer:
    """Technical analysis service."""
    
    def __init__(self, rsi_period: int = 14, macd_fast: int = 12, 
                 macd_slow: int = 26, macd_signal: int = 9,
                 bb_period: int = 20, bb_std: float = 2.0):
        """Initialize technical analyzer."""
        self.rsi_period = rsi_period
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal = macd_signal
        self.bb_period = bb_period
        self.bb_std = bb_std
    
    def calculate_rsi(self, prices: pd.Series) -> pd.Series:
        """Calculate RSI indicator."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def calculate_macd(self, prices: pd.Series) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate MACD indicator."""
        ema_fast = prices.ewm(span=self.macd_fast, adjust=False).mean()
        ema_slow = prices.ewm(span=self.macd_slow, adjust=False).mean()
        
        macd = ema_fast - ema_slow
        signal = macd.ewm(span=self.macd_signal, adjust=False).mean()
        histogram = macd - signal
        
        return macd, signal, histogram
    
    def calculate_bollinger_bands(self, prices: pd.Series) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate Bollinger Bands."""
        sma = prices.rolling(window=self.bb_period).mean()
        std = prices.rolling(window=self.bb_period).std()
        
        upper_band = sma + (std * self.bb_std)
        lower_band = sma - (std * self.bb_std)
        
        return upper_band, sma, lower_band
    
    def calculate_stochastic(self, high: pd.Series, low: pd.Series, 
                            close: pd.Series, period: int = 14) -> Tuple[pd.Series, pd.Series]:
        """Calculate Stochastic Oscillator."""
        lowest_low = low.rolling(window=period).min()
        highest_high = high.rolling(window=period).max()
        
        k = 100 * (close - lowest_low) / (highest_high - lowest_low)
        d = k.rolling(window=3).mean()
        
        return k, d
    
    def calculate_atr(self, high: pd.Series, low: pd.Series, 
                     close: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Average True Range."""
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    def calculate_adx(self, high: pd.Series, low: pd.Series, 
                     close: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Average Directional Index."""
        plus_dm = high.diff()
        minus_dm = -low.diff()
        
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        tr = self.calculate_atr(high, low, close, 1)
        
        plus_di = 100 * (plus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())
        minus_di = 100 * (minus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(window=period).mean()
        
        return adx
    
    def calculate_obv(self, close: pd.Series, volume: pd.Series) -> pd.Series:
        """Calculate On-Balance Volume."""
        obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()
        return obv
    
    def calculate_ema(self, prices: pd.Series, period: int) -> pd.Series:
        """Calculate Exponential Moving Average."""
        return prices.ewm(span=period, adjust=False).mean()
    
    def calculate_vwap(self, high: pd.Series, low: pd.Series, 
                      close: pd.Series, volume: pd.Series) -> pd.Series:
        """Calculate Volume Weighted Average Price."""
        typical_price = (high + low + close) / 3
        vwap = (typical_price * volume).cumsum() / volume.cumsum()
        return vwap
    
    def identify_support_resistance(self, prices: pd.Series, 
                                   window: int = 20) -> Tuple[List[float], List[float]]:
        """Identify support and resistance levels."""
        # Find local minima and maxima
        support_levels = []
        resistance_levels = []
        
        for i in range(window, len(prices) - window):
            if prices.iloc[i] == prices.iloc[i - window:i + window].min():
                support_levels.append(float(prices.iloc[i]))
            if prices.iloc[i] == prices.iloc[i - window:i + window].max():
                resistance_levels.append(float(prices.iloc[i]))
        
        # Cluster nearby levels
        support_levels = self._cluster_levels(support_levels)
        resistance_levels = self._cluster_levels(resistance_levels)
        
        return support_levels[:5], resistance_levels[:5]
    
    def _cluster_levels(self, levels: List[float], threshold: float = 0.02) -> List[float]:
        """Cluster nearby price levels."""
        if not levels:
            return []
        
        sorted_levels = sorted(levels)
        clustered = [sorted_levels[0]]
        
        for level in sorted_levels[1:]:
            if abs(level - clustered[-1]) / clustered[-1] > threshold:
                clustered.append(level)
        
        return clustered
    
    def analyze(self, df: pd.DataFrame) -> Dict:
        """
        Perform comprehensive technical analysis.
        
        Args:
            df: DataFrame with columns: open, high, low, close, volume
        
        Returns:
            Dictionary with all indicators and signals
        """
        try:
            close = df['close']
            high = df['high']
            low = df['low']
            volume = df['volume']
            
            # Calculate indicators
            rsi = self.calculate_rsi(close)
            macd, macd_signal, macd_hist = self.calculate_macd(close)
            bb_upper, bb_middle, bb_lower = self.calculate_bollinger_bands(close)
            stoch_k, stoch_d = self.calculate_stochastic(high, low, close)
            atr = self.calculate_atr(high, low, close)
            adx = self.calculate_adx(high, low, close)
            obv = self.calculate_obv(close, volume)
            ema_20 = self.calculate_ema(close, 20)
            ema_50 = self.calculate_ema(close, 50)
            ema_200 = self.calculate_ema(close, 200)
            vwap = self.calculate_vwap(high, low, close, volume)
            
            support_levels, resistance_levels = self.identify_support_resistance(close)
            
            # Get latest values
            latest_idx = -1
            current_price = float(close.iloc[latest_idx])
            
            indicators = {
                'rsi': float(rsi.iloc[latest_idx]) if not pd.isna(rsi.iloc[latest_idx]) else None,
                'macd': float(macd.iloc[latest_idx]) if not pd.isna(macd.iloc[latest_idx]) else None,
                'macd_signal': float(macd_signal.iloc[latest_idx]) if not pd.isna(macd_signal.iloc[latest_idx]) else None,
                'macd_histogram': float(macd_hist.iloc[latest_idx]) if not pd.isna(macd_hist.iloc[latest_idx]) else None,
                'bb_upper': float(bb_upper.iloc[latest_idx]) if not pd.isna(bb_upper.iloc[latest_idx]) else None,
                'bb_middle': float(bb_middle.iloc[latest_idx]) if not pd.isna(bb_middle.iloc[latest_idx]) else None,
                'bb_lower': float(bb_lower.iloc[latest_idx]) if not pd.isna(bb_lower.iloc[latest_idx]) else None,
                'stoch_k': float(stoch_k.iloc[latest_idx]) if not pd.isna(stoch_k.iloc[latest_idx]) else None,
                'stoch_d': float(stoch_d.iloc[latest_idx]) if not pd.isna(stoch_d.iloc[latest_idx]) else None,
                'atr': float(atr.iloc[latest_idx]) if not pd.isna(atr.iloc[latest_idx]) else None,
                'adx': float(adx.iloc[latest_idx]) if not pd.isna(adx.iloc[latest_idx]) else None,
                'obv': float(obv.iloc[latest_idx]) if not pd.isna(obv.iloc[latest_idx]) else None,
                'ema_20': float(ema_20.iloc[latest_idx]) if not pd.isna(ema_20.iloc[latest_idx]) else None,
                'ema_50': float(ema_50.iloc[latest_idx]) if not pd.isna(ema_50.iloc[latest_idx]) else None,
                'ema_200': float(ema_200.iloc[latest_idx]) if not pd.isna(ema_200.iloc[latest_idx]) else None,
                'vwap': float(vwap.iloc[latest_idx]) if not pd.isna(vwap.iloc[latest_idx]) else None,
            }
            
            # Generate signals
            signals = self.generate_signals(indicators, current_price)
            
            return {
                'indicators': indicators,
                'support_levels': support_levels,
                'resistance_levels': resistance_levels,
                'signals': signals,
                'current_price': current_price,
            }
        
        except Exception as e:
            logger.error("Technical analysis failed", error=str(e))
            raise
    
    def generate_signals(self, indicators: Dict, current_price: float) -> Dict:
        """Generate trading signals from indicators."""
        signals = []
        score = 0.0
        
        # RSI signals
        if indicators.get('rsi'):
            rsi = indicators['rsi']
            if rsi < 30:
                signals.append({'indicator': 'RSI', 'signal': 'buy', 'reason': 'Oversold'})
                score += 1
            elif rsi > 70:
                signals.append({'indicator': 'RSI', 'signal': 'sell', 'reason': 'Overbought'})
                score -= 1
        
        # MACD signals
        if indicators.get('macd') and indicators.get('macd_signal'):
            if indicators['macd'] > indicators['macd_signal'] and indicators['macd_histogram'] > 0:
                signals.append({'indicator': 'MACD', 'signal': 'buy', 'reason': 'Bullish crossover'})
                score += 1
            elif indicators['macd'] < indicators['macd_signal'] and indicators['macd_histogram'] < 0:
                signals.append({'indicator': 'MACD', 'signal': 'sell', 'reason': 'Bearish crossover'})
                score -= 1
        
        # Bollinger Bands signals
        if indicators.get('bb_lower') and indicators.get('bb_upper'):
            if current_price <= indicators['bb_lower']:
                signals.append({'indicator': 'BB', 'signal': 'buy', 'reason': 'Price at lower band'})
                score += 1
            elif current_price >= indicators['bb_upper']:
                signals.append({'indicator': 'BB', 'signal': 'sell', 'reason': 'Price at upper band'})
                score -= 1
        
        # Stochastic signals
        if indicators.get('stoch_k'):
            stoch_k = indicators['stoch_k']
            if stoch_k < 20:
                signals.append({'indicator': 'Stochastic', 'signal': 'buy', 'reason': 'Oversold'})
                score += 0.5
            elif stoch_k > 80:
                signals.append({'indicator': 'Stochastic', 'signal': 'sell', 'reason': 'Overbought'})
                score -= 0.5
        
        # EMA trend signals
        if indicators.get('ema_20') and indicators.get('ema_50'):
            if indicators['ema_20'] > indicators['ema_50']:
                signals.append({'indicator': 'EMA', 'signal': 'buy', 'reason': 'Bullish trend'})
                score += 0.5
            else:
                signals.append({'indicator': 'EMA', 'signal': 'sell', 'reason': 'Bearish trend'})
                score -= 0.5
        
        # Normalize score to confidence (0-1)
        max_score = 5.0
        confidence = min(abs(score) / max_score, 1.0)
        
        signal_type = 'hold'
        if score > 1:
            signal_type = 'buy'
        elif score < -1:
            signal_type = 'sell'
        
        return {
            'signal_type': signal_type,
            'confidence': round(confidence, 2),
            'score': round(score, 2),
            'details': signals
        }
