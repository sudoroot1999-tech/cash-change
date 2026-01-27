"""Sentiment analysis from news and social media."""
from typing import List, Dict, Optional
from datetime import datetime
import re
import structlog
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

logger = structlog.get_logger()


class SentimentAnalyzer:
    """Sentiment analysis service."""
    
    def __init__(self):
        """Initialize sentiment analyzer."""
        self.vader = SentimentIntensityAnalyzer()
        
        # Crypto-specific keywords and their sentiment weights
        self.crypto_lexicon = {
            'moon': 2.0, 'lambo': 2.0, 'bullish': 2.0, 'bearish': -2.0,
            'dump': -2.0, 'pump': 1.5, 'hodl': 1.0, 'fomo': 0.5,
            'fud': -1.5, 'rekt': -2.0, 'ath': 2.0, 'dip': -0.5,
            'rally': 1.5, 'crash': -2.0, 'surge': 1.5, 'plunge': -1.5,
            'breakthrough': 1.5, 'resistance': 0.5, 'support': 0.5,
            'accumulation': 1.0, 'distribution': -1.0, 'breakout': 1.5,
            'breakdown': -1.5, 'whale': 0.5, 'adoption': 1.5,
            'regulation': -0.5, 'ban': -2.0, 'approval': 1.5,
            'etf': 1.0, 'halving': 1.5, 'fork': -0.5,
        }
        
        # Update VADER lexicon with crypto terms
        self.vader.lexicon.update(self.crypto_lexicon)
    
    def clean_text(self, text: str) -> str:
        """Clean and preprocess text."""
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text)
        
        # Remove mentions and hashtags (but keep the text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?]', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text.strip()
    
    def analyze_text(self, text: str) -> Dict:
        """
        Analyze sentiment of a single text.
        
        Returns:
            Dictionary with sentiment scores
        """
        if not text or not text.strip():
            return {
                'compound': 0.0,
                'positive': 0.0,
                'neutral': 1.0,
                'negative': 0.0,
                'sentiment': 'neutral',
                'confidence': 0.0
            }
        
        # Clean text
        cleaned_text = self.clean_text(text)
        
        # VADER sentiment
        vader_scores = self.vader.polarity_scores(cleaned_text)
        
        # TextBlob sentiment (for comparison)
        try:
            blob = TextBlob(cleaned_text)
            textblob_polarity = blob.sentiment.polarity
            textblob_subjectivity = blob.sentiment.subjectivity
        except:
            textblob_polarity = 0.0
            textblob_subjectivity = 0.5
        
        # Combine scores (weighted average)
        compound = (vader_scores['compound'] * 0.7 + textblob_polarity * 0.3)
        
        # Determine sentiment category
        if compound >= 0.05:
            sentiment = 'positive'
        elif compound <= -0.05:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        # Confidence based on subjectivity and score magnitude
        confidence = abs(compound) * (1 - textblob_subjectivity * 0.3)
        confidence = min(max(confidence, 0.0), 1.0)
        
        return {
            'compound': round(compound, 3),
            'positive': round(vader_scores['pos'], 3),
            'neutral': round(vader_scores['neu'], 3),
            'negative': round(vader_scores['neg'], 3),
            'sentiment': sentiment,
            'confidence': round(confidence, 3),
            'subjectivity': round(textblob_subjectivity, 3)
        }
    
    def analyze_batch(self, texts: List[str]) -> List[Dict]:
        """Analyze sentiment for multiple texts."""
        return [self.analyze_text(text) for text in texts]
    
    def aggregate_sentiment(self, texts: List[str], 
                          weights: Optional[List[float]] = None) -> Dict:
        """
        Aggregate sentiment from multiple texts.
        
        Args:
            texts: List of text strings
            weights: Optional weights for each text (e.g., based on source reliability)
        
        Returns:
            Aggregated sentiment scores
        """
        if not texts:
            return {
                'overall_sentiment': 'neutral',
                'average_score': 0.0,
                'confidence': 0.0,
                'sample_size': 0,
                'distribution': {'positive': 0, 'neutral': 0, 'negative': 0}
            }
        
        if weights is None:
            weights = [1.0] * len(texts)
        
        if len(weights) != len(texts):
            raise ValueError("Weights must match number of texts")
        
        # Analyze all texts
        results = self.analyze_batch(texts)
        
        # Calculate weighted averages
        total_weight = sum(weights)
        weighted_scores = sum(r['compound'] * w for r, w in zip(results, weights)) / total_weight
        weighted_confidence = sum(r['confidence'] * w for r, w in zip(results, weights)) / total_weight
        
        # Count sentiment distribution
        distribution = {
            'positive': sum(1 for r in results if r['sentiment'] == 'positive'),
            'neutral': sum(1 for r in results if r['sentiment'] == 'neutral'),
            'negative': sum(1 for r in results if r['sentiment'] == 'negative')
        }
        
        # Determine overall sentiment
        if weighted_scores >= 0.05:
            overall_sentiment = 'positive'
        elif weighted_scores <= -0.05:
            overall_sentiment = 'negative'
        else:
            overall_sentiment = 'neutral'
        
        return {
            'overall_sentiment': overall_sentiment,
            'average_score': round(weighted_scores, 3),
            'confidence': round(weighted_confidence, 3),
            'sample_size': len(texts),
            'distribution': distribution,
            'positive_ratio': round(distribution['positive'] / len(texts), 3),
            'negative_ratio': round(distribution['negative'] / len(texts), 3)
        }
    
    def analyze_news(self, news_items: List[Dict]) -> Dict:
        """
        Analyze sentiment from news articles.
        
        Args:
            news_items: List of dicts with 'title', 'description', 'source', 'published_at'
        
        Returns:
            Sentiment analysis results
        """
        if not news_items:
            return self.aggregate_sentiment([])
        
        # Combine title and description for each article
        texts = []
        weights = []
        
        for item in news_items:
            title = item.get('title', '')
            description = item.get('description', '')
            text = f"{title}. {description}"
            texts.append(text)
            
            # Weight based on source reliability (can be customized)
            source = item.get('source', '').lower()
            if any(reliable in source for reliable in ['reuters', 'bloomberg', 'coindesk', 'cointelegraph']):
                weight = 1.5
            else:
                weight = 1.0
            weights.append(weight)
        
        result = self.aggregate_sentiment(texts, weights)
        result['sources'] = len(news_items)
        
        return result
    
    def analyze_social_media(self, posts: List[Dict]) -> Dict:
        """
        Analyze sentiment from social media posts.
        
        Args:
            posts: List of dicts with 'text', 'engagement', 'platform'
        
        Returns:
            Sentiment analysis results
        """
        if not posts:
            return self.aggregate_sentiment([])
        
        texts = [post.get('text', '') for post in posts]
        
        # Weight by engagement (likes, retweets, etc.)
        weights = []
        for post in posts:
            engagement = post.get('engagement', 1)
            # Logarithmic scaling for engagement to avoid extreme weights
            import math
            weight = 1.0 + math.log10(max(engagement, 1))
            weights.append(weight)
        
        result = self.aggregate_sentiment(texts, weights)
        result['posts'] = len(posts)
        result['total_engagement'] = sum(post.get('engagement', 0) for post in posts)
        
        return result
    
    def get_market_sentiment(self, pair: str, news: List[Dict] = None, 
                           social: List[Dict] = None) -> Dict:
        """
        Get comprehensive market sentiment for a trading pair.
        
        Args:
            pair: Trading pair (e.g., "BTC/USD")
            news: News articles
            social: Social media posts
        
        Returns:
            Combined sentiment analysis
        """
        results = {
            'pair': pair,
            'timestamp': datetime.utcnow().isoformat(),
            'overall_sentiment': 'neutral',
            'overall_score': 0.0,
            'confidence': 0.0
        }
        
        sentiment_scores = []
        confidences = []
        
        # Analyze news
        if news:
            news_sentiment = self.analyze_news(news)
            results['news_sentiment'] = news_sentiment
            sentiment_scores.append(news_sentiment['average_score'] * 0.6)  # Higher weight for news
            confidences.append(news_sentiment['confidence'])
        
        # Analyze social media
        if social:
            social_sentiment = self.analyze_social_media(social)
            results['social_sentiment'] = social_sentiment
            sentiment_scores.append(social_sentiment['average_score'] * 0.4)  # Lower weight for social
            confidences.append(social_sentiment['confidence'])
        
        # Calculate overall sentiment
        if sentiment_scores:
            overall_score = sum(sentiment_scores)
            overall_confidence = sum(confidences) / len(confidences)
            
            if overall_score >= 0.05:
                overall_sentiment = 'bullish'
            elif overall_score <= -0.05:
                overall_sentiment = 'bearish'
            else:
                overall_sentiment = 'neutral'
            
            results['overall_sentiment'] = overall_sentiment
            results['overall_score'] = round(overall_score, 3)
            results['confidence'] = round(overall_confidence, 3)
        
        return results
    
    def detect_anomalies(self, historical_sentiments: List[Dict]) -> List[Dict]:
        """
        Detect anomalous sentiment changes.
        
        Args:
            historical_sentiments: List of historical sentiment data with 'score' and 'timestamp'
        
        Returns:
            List of detected anomalies
        """
        if len(historical_sentiments) < 10:
            return []
        
        scores = [s['score'] for s in historical_sentiments]
        
        # Calculate statistics
        mean_score = sum(scores) / len(scores)
        variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
        std_dev = variance ** 0.5
        
        # Detect anomalies (> 2 standard deviations)
        anomalies = []
        for i, sentiment in enumerate(historical_sentiments):
            score = sentiment['score']
            z_score = (score - mean_score) / std_dev if std_dev > 0 else 0
            
            if abs(z_score) > 2:
                anomalies.append({
                    'timestamp': sentiment.get('timestamp'),
                    'score': score,
                    'z_score': round(z_score, 2),
                    'deviation': 'positive' if z_score > 0 else 'negative',
                    'significance': 'high' if abs(z_score) > 3 else 'medium'
                })
        
        return anomalies
