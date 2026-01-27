"""Tests for technical analysis service."""
import pytest
import pandas as pd
import numpy as np

from src.services.technical_analysis import TechnicalAnalyzer


def test_calculate_rsi(sample_ohlcv_data):
    """Test RSI calculation."""
    analyzer = TechnicalAnalyzer()
    rsi = analyzer.calculate_rsi(sample_ohlcv_data['close'])
    
    assert len(rsi) == len(sample_ohlcv_data)
    assert rsi.iloc[-1] >= 0
    assert rsi.iloc[-1] <= 100


def test_calculate_macd(sample_ohlcv_data):
    """Test MACD calculation."""
    analyzer = TechnicalAnalyzer()
    macd, signal, histogram = analyzer.calculate_macd(sample_ohlcv_data['close'])
    
    assert len(macd) == len(sample_ohlcv_data)
    assert len(signal) == len(sample_ohlcv_data)
    assert len(histogram) == len(sample_ohlcv_data)


def test_calculate_bollinger_bands(sample_ohlcv_data):
    """Test Bollinger Bands calculation."""
    analyzer = TechnicalAnalyzer()
    upper, middle, lower = analyzer.calculate_bollinger_bands(sample_ohlcv_data['close'])
    
    assert len(upper) == len(sample_ohlcv_data)
    assert all(upper.iloc[-20:] >= middle.iloc[-20:])
    assert all(middle.iloc[-20:] >= lower.iloc[-20:])


def test_analyze(sample_ohlcv_data):
    """Test comprehensive analysis."""
    analyzer = TechnicalAnalyzer()
    result = analyzer.analyze(sample_ohlcv_data)
    
    assert 'indicators' in result
    assert 'support_levels' in result
    assert 'resistance_levels' in result
    assert 'signals' in result
    assert 'current_price' in result
    
    # Check signal format
    signals = result['signals']
    assert 'signal_type' in signals
    assert 'confidence' in signals
    assert signals['signal_type'] in ['buy', 'sell', 'hold']
    assert 0 <= signals['confidence'] <= 1


def test_generate_signals(sample_ohlcv_data):
    """Test signal generation."""
    analyzer = TechnicalAnalyzer()
    indicators = {
        'rsi': 25,  # Oversold
        'macd': 100,
        'macd_signal': 50,
        'macd_histogram': 50,
        'bb_lower': 49000,
        'bb_upper': 51000,
        'ema_20': 50200,
        'ema_50': 50100
    }
    
    current_price = 50000
    signals = analyzer.generate_signals(indicators, current_price)
    
    assert 'signal_type' in signals
    assert 'confidence' in signals
    assert 'score' in signals
    assert 'details' in signals
    
    # With RSI oversold, should lean towards buy
    assert signals['signal_type'] in ['buy', 'hold']
