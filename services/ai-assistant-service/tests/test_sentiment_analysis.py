"""Tests for sentiment analysis service."""
import pytest

from src.services.sentiment_analysis import SentimentAnalyzer


def test_analyze_text_positive():
    """Test positive sentiment analysis."""
    analyzer = SentimentAnalyzer()
    
    text = "Bitcoin is surging to new highs! Great opportunity to buy. Bullish trend confirmed!"
    result = analyzer.analyze_text(text)
    
    assert result['sentiment'] == 'positive'
    assert result['compound'] > 0
    assert 0 <= result['confidence'] <= 1


def test_analyze_text_negative():
    """Test negative sentiment analysis."""
    analyzer = SentimentAnalyzer()
    
    text = "Market crash incoming. Bearish signals everywhere. Time to sell before it's too late."
    result = analyzer.analyze_text(text)
    
    assert result['sentiment'] == 'negative'
    assert result['compound'] < 0


def test_analyze_text_neutral():
    """Test neutral sentiment analysis."""
    analyzer = SentimentAnalyzer()
    
    text = "The price is at $50000."
    result = analyzer.analyze_text(text)
    
    assert result['sentiment'] == 'neutral'
    assert abs(result['compound']) < 0.05


def test_crypto_specific_keywords():
    """Test crypto-specific sentiment."""
    analyzer = SentimentAnalyzer()
    
    # Test "moon" keyword
    result1 = analyzer.analyze_text("Bitcoin to the moon! 🚀")
    assert result1['sentiment'] == 'positive'
    
    # Test "dump" keyword
    result2 = analyzer.analyze_text("Massive dump incoming")
    assert result2['sentiment'] == 'negative'
    
    # Test "hodl" keyword
    result3 = analyzer.analyze_text("Just hodl and wait")
    assert result3['compound'] > 0


def test_aggregate_sentiment():
    """Test sentiment aggregation."""
    analyzer = SentimentAnalyzer()
    
    texts = [
        "Bitcoin is bullish!",
        "Great gains today",
        "Market looks strong",
        "Bearish signals appearing"
    ]
    
    result = analyzer.aggregate_sentiment(texts)
    
    assert 'overall_sentiment' in result
    assert 'average_score' in result
    assert 'confidence' in result
    assert 'sample_size' in result
    assert 'distribution' in result
    
    assert result['sample_size'] == 4
    assert result['overall_sentiment'] in ['positive', 'negative', 'neutral']


def test_analyze_news():
    """Test news sentiment analysis."""
    analyzer = SentimentAnalyzer()
    
    news_items = [
        {
            'title': 'Bitcoin breaks $60k',
            'description': 'Strong momentum continues',
            'source': 'CoinDesk'
        },
        {
            'title': 'Ethereum reaches new ATH',
            'description': 'Bullish trend confirmed',
            'source': 'CoinTelegraph'
        }
    ]
    
    result = analyzer.analyze_news(news_items)
    
    assert 'overall_sentiment' in result
    assert result['sources'] == 2
    assert result['overall_sentiment'] == 'positive'


def test_detect_anomalies():
    """Test anomaly detection."""
    analyzer = SentimentAnalyzer()
    
    # Normal sentiments
    historical = [
        {'score': 0.1, 'timestamp': '2024-01-01'},
        {'score': 0.15, 'timestamp': '2024-01-02'},
        {'score': 0.12, 'timestamp': '2024-01-03'},
        {'score': 0.13, 'timestamp': '2024-01-04'},
        {'score': 0.11, 'timestamp': '2024-01-05'},
        {'score': 0.14, 'timestamp': '2024-01-06'},
        {'score': 0.16, 'timestamp': '2024-01-07'},
        {'score': 0.12, 'timestamp': '2024-01-08'},
        {'score': 0.85, 'timestamp': '2024-01-09'},  # Anomaly
        {'score': 0.13, 'timestamp': '2024-01-10'}
    ]
    
    anomalies = analyzer.detect_anomalies(historical)
    
    assert len(anomalies) > 0
    assert anomalies[0]['significance'] in ['high', 'medium']
