"""Pattern recognition for chart patterns."""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from scipy.signal import find_peaks
import structlog

logger = structlog.get_logger()


class PatternRecognizer:
    """Chart pattern recognition service."""
    
    def __init__(self, min_pattern_size: int = 10):
        """Initialize pattern recognizer."""
        self.min_pattern_size = min_pattern_size
    
    def detect_head_and_shoulders(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect head and shoulders pattern."""
        close = df['close'].values
        high = df['high'].values
        
        # Find peaks
        peaks, _ = find_peaks(high, distance=self.min_pattern_size)
        
        if len(peaks) < 3:
            return None
        
        # Look for three consecutive peaks where middle is highest
        for i in range(len(peaks) - 2):
            left_shoulder = high[peaks[i]]
            head = high[peaks[i + 1]]
            right_shoulder = high[peaks[i + 2]]
            
            # Check if it's a head and shoulders pattern
            if head > left_shoulder and head > right_shoulder:
                if abs(left_shoulder - right_shoulder) / left_shoulder < 0.05:  # Shoulders at similar level
                    return {
                        'pattern': 'head_and_shoulders',
                        'type': 'bearish',
                        'confidence': 0.75,
                        'left_shoulder': float(left_shoulder),
                        'head': float(head),
                        'right_shoulder': float(right_shoulder),
                        'neckline': float((left_shoulder + right_shoulder) / 2),
                        'target': float((left_shoulder + right_shoulder) / 2 - (head - (left_shoulder + right_shoulder) / 2)),
                    }
        
        return None
    
    def detect_inverse_head_and_shoulders(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect inverse head and shoulders pattern."""
        close = df['close'].values
        low = df['low'].values
        
        # Find troughs
        troughs, _ = find_peaks(-low, distance=self.min_pattern_size)
        
        if len(troughs) < 3:
            return None
        
        # Look for three consecutive troughs where middle is lowest
        for i in range(len(troughs) - 2):
            left_shoulder = low[troughs[i]]
            head = low[troughs[i + 1]]
            right_shoulder = low[troughs[i + 2]]
            
            # Check if it's an inverse head and shoulders pattern
            if head < left_shoulder and head < right_shoulder:
                if abs(left_shoulder - right_shoulder) / left_shoulder < 0.05:
                    return {
                        'pattern': 'inverse_head_and_shoulders',
                        'type': 'bullish',
                        'confidence': 0.75,
                        'left_shoulder': float(left_shoulder),
                        'head': float(head),
                        'right_shoulder': float(right_shoulder),
                        'neckline': float((left_shoulder + right_shoulder) / 2),
                        'target': float((left_shoulder + right_shoulder) / 2 + ((left_shoulder + right_shoulder) / 2 - head)),
                    }
        
        return None
    
    def detect_double_top(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect double top pattern."""
        high = df['high'].values
        
        # Find peaks
        peaks, properties = find_peaks(high, distance=self.min_pattern_size, prominence=1)
        
        if len(peaks) < 2:
            return None
        
        # Look for two peaks at similar levels
        for i in range(len(peaks) - 1):
            peak1 = high[peaks[i]]
            peak2 = high[peaks[i + 1]]
            
            if abs(peak1 - peak2) / peak1 < 0.03:  # Peaks within 3%
                trough_between = np.min(high[peaks[i]:peaks[i + 1]])
                return {
                    'pattern': 'double_top',
                    'type': 'bearish',
                    'confidence': 0.70,
                    'peak1': float(peak1),
                    'peak2': float(peak2),
                    'support': float(trough_between),
                    'target': float(trough_between - (peak1 - trough_between)),
                }
        
        return None
    
    def detect_double_bottom(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect double bottom pattern."""
        low = df['low'].values
        
        # Find troughs
        troughs, _ = find_peaks(-low, distance=self.min_pattern_size, prominence=1)
        
        if len(troughs) < 2:
            return None
        
        # Look for two troughs at similar levels
        for i in range(len(troughs) - 1):
            trough1 = low[troughs[i]]
            trough2 = low[troughs[i + 1]]
            
            if abs(trough1 - trough2) / trough1 < 0.03:  # Troughs within 3%
                peak_between = np.max(low[troughs[i]:troughs[i + 1]])
                return {
                    'pattern': 'double_bottom',
                    'type': 'bullish',
                    'confidence': 0.70,
                    'trough1': float(trough1),
                    'trough2': float(trough2),
                    'resistance': float(peak_between),
                    'target': float(peak_between + (peak_between - trough1)),
                }
        
        return None
    
    def detect_triangle(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect triangle patterns (ascending, descending, symmetrical)."""
        high = df['high'].values
        low = df['low'].values
        
        if len(high) < 20:
            return None
        
        # Get recent data
        recent_high = high[-20:]
        recent_low = low[-20:]
        
        # Fit trend lines
        x = np.arange(len(recent_high))
        high_coef = np.polyfit(x, recent_high, 1)
        low_coef = np.polyfit(x, recent_low, 1)
        
        high_slope = high_coef[0]
        low_slope = low_coef[0]
        
        # Determine triangle type
        if abs(high_slope) < 0.01 and low_slope > 0.01:  # Ascending
            return {
                'pattern': 'ascending_triangle',
                'type': 'bullish',
                'confidence': 0.65,
                'resistance': float(np.mean(recent_high[-5:])),
                'support_slope': float(low_slope),
            }
        elif abs(low_slope) < 0.01 and high_slope < -0.01:  # Descending
            return {
                'pattern': 'descending_triangle',
                'type': 'bearish',
                'confidence': 0.65,
                'support': float(np.mean(recent_low[-5:])),
                'resistance_slope': float(high_slope),
            }
        elif abs(high_slope + low_slope) < 0.02:  # Symmetrical
            return {
                'pattern': 'symmetrical_triangle',
                'type': 'neutral',
                'confidence': 0.60,
                'high_slope': float(high_slope),
                'low_slope': float(low_slope),
            }
        
        return None
    
    def detect_flag(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect flag and pennant patterns."""
        close = df['close'].values
        volume = df['volume'].values
        
        if len(close) < 30:
            return None
        
        # Look for sharp move (flagpole) followed by consolidation
        recent = close[-30:]
        
        # Check for strong trend in first part
        first_half = recent[:15]
        second_half = recent[15:]
        
        first_trend = (first_half[-1] - first_half[0]) / first_half[0]
        second_volatility = np.std(second_half) / np.mean(second_half)
        
        # Bullish flag: strong uptrend followed by slight downtrend/consolidation
        if first_trend > 0.05 and second_volatility < 0.02:
            return {
                'pattern': 'bull_flag',
                'type': 'bullish',
                'confidence': 0.65,
                'flagpole_gain': float(first_trend * 100),
                'consolidation_range': float(second_volatility * 100),
            }
        
        # Bearish flag: strong downtrend followed by slight uptrend/consolidation
        if first_trend < -0.05 and second_volatility < 0.02:
            return {
                'pattern': 'bear_flag',
                'type': 'bearish',
                'confidence': 0.65,
                'flagpole_loss': float(first_trend * 100),
                'consolidation_range': float(second_volatility * 100),
            }
        
        return None
    
    def detect_wedge(self, df: pd.DataFrame) -> Optional[Dict]:
        """Detect rising and falling wedge patterns."""
        high = df['high'].values
        low = df['low'].values
        
        if len(high) < 20:
            return None
        
        recent_high = high[-20:]
        recent_low = low[-20:]
        
        x = np.arange(len(recent_high))
        high_coef = np.polyfit(x, recent_high, 1)
        low_coef = np.polyfit(x, recent_low, 1)
        
        high_slope = high_coef[0]
        low_slope = low_coef[0]
        
        # Both slopes positive and converging = Rising wedge (bearish)
        if high_slope > 0 and low_slope > 0 and high_slope < low_slope:
            return {
                'pattern': 'rising_wedge',
                'type': 'bearish',
                'confidence': 0.65,
                'upper_slope': float(high_slope),
                'lower_slope': float(low_slope),
            }
        
        # Both slopes negative and converging = Falling wedge (bullish)
        if high_slope < 0 and low_slope < 0 and high_slope > low_slope:
            return {
                'pattern': 'falling_wedge',
                'type': 'bullish',
                'confidence': 0.65,
                'upper_slope': float(high_slope),
                'lower_slope': float(low_slope),
            }
        
        return None
    
    def detect_all_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect all patterns in the data."""
        patterns = []
        
        try:
            # Try each pattern detection
            pattern_methods = [
                self.detect_head_and_shoulders,
                self.detect_inverse_head_and_shoulders,
                self.detect_double_top,
                self.detect_double_bottom,
                self.detect_triangle,
                self.detect_flag,
                self.detect_wedge,
            ]
            
            for method in pattern_methods:
                try:
                    pattern = method(df)
                    if pattern:
                        patterns.append(pattern)
                except Exception as e:
                    logger.warning(f"Pattern detection failed for {method.__name__}", error=str(e))
            
            return patterns
        
        except Exception as e:
            logger.error("Pattern detection failed", error=str(e))
            return []
    
    def get_pattern_signal(self, patterns: List[Dict]) -> Dict:
        """Generate trading signal from detected patterns."""
        if not patterns:
            return {
                'signal_type': 'hold',
                'confidence': 0.0,
                'patterns': []
            }
        
        # Aggregate signals
        bullish_score = 0.0
        bearish_score = 0.0
        
        for pattern in patterns:
            if pattern['type'] == 'bullish':
                bullish_score += pattern['confidence']
            elif pattern['type'] == 'bearish':
                bearish_score += pattern['confidence']
        
        # Determine overall signal
        if bullish_score > bearish_score and bullish_score > 0.6:
            signal_type = 'buy'
            confidence = min(bullish_score, 1.0)
        elif bearish_score > bullish_score and bearish_score > 0.6:
            signal_type = 'sell'
            confidence = min(bearish_score, 1.0)
        else:
            signal_type = 'hold'
            confidence = 0.5
        
        return {
            'signal_type': signal_type,
            'confidence': round(confidence, 2),
            'patterns': patterns,
            'bullish_score': round(bullish_score, 2),
            'bearish_score': round(bearish_score, 2),
        }
