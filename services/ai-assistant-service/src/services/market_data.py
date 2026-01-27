"""Market data fetching and processing."""
import httpx
import pandas as pd
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import structlog

from src.config import settings
from src.database import RedisClient

logger = structlog.get_logger()


class MarketDataService:
    """Service for fetching and caching market data."""
    
    def __init__(self):
        """Initialize market data service."""
        self.base_url = settings.market_data_service_url
        self.cache_ttl = settings.cache_ttl
    
    async def get_ohlcv(self, pair: str, timeframe: str = "1h", 
                       limit: int = 100) -> pd.DataFrame:
        """
        Fetch OHLCV data for a trading pair.
        
        Args:
            pair: Trading pair (e.g., "BTC/USD")
            timeframe: Timeframe (e.g., "1m", "5m", "1h", "1d")
            limit: Number of candles to fetch
        
        Returns:
            DataFrame with OHLCV data
        """
        try:
            # Check cache first
            cache_key = f"ohlcv:{pair}:{timeframe}:{limit}"
            cached = await RedisClient.get(cache_key)
            
            if cached:
                import json
                data = json.loads(cached)
                df = pd.DataFrame(data)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                logger.info("OHLCV data retrieved from cache", pair=pair)
                return df
            
            # Fetch from market data service
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/market-data/ohlcv",
                    params={
                        "pair": pair,
                        "timeframe": timeframe,
                        "limit": limit
                    }
                )
                response.raise_for_status()
                data = response.json()
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Ensure required columns
            required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required_columns):
                raise ValueError("Missing required OHLCV columns")
            
            # Convert types
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = pd.to_numeric(df[col])
            
            # Cache the result
            import json
            cache_data = df.to_dict(orient='records')
            # Convert timestamps to strings for JSON
            for record in cache_data:
                record['timestamp'] = record['timestamp'].isoformat()
            
            await RedisClient.set(
                cache_key,
                json.dumps(cache_data),
                ttl=60  # Cache for 1 minute
            )
            
            logger.info("OHLCV data fetched", pair=pair, rows=len(df))
            return df
        
        except Exception as e:
            logger.error("Failed to fetch OHLCV data", error=str(e), pair=pair)
            # Return mock data for development
            return self._generate_mock_ohlcv(limit)
    
    def _generate_mock_ohlcv(self, limit: int = 100) -> pd.DataFrame:
        """Generate mock OHLCV data for testing."""
        import numpy as np
        
        # Generate timestamps
        end_time = datetime.utcnow()
        timestamps = [end_time - timedelta(hours=i) for i in range(limit)]
        timestamps.reverse()
        
        # Generate price data with random walk
        base_price = 50000.0
        prices = [base_price]
        
        for _ in range(limit - 1):
            change = np.random.normal(0, base_price * 0.01)
            new_price = prices[-1] + change
            prices.append(max(new_price, base_price * 0.5))  # Prevent negative prices
        
        data = {
            'timestamp': timestamps,
            'open': prices,
            'high': [p * (1 + abs(np.random.normal(0, 0.005))) for p in prices],
            'low': [p * (1 - abs(np.random.normal(0, 0.005))) for p in prices],
            'close': [p * (1 + np.random.normal(0, 0.003)) for p in prices],
            'volume': [np.random.uniform(1000000, 5000000) for _ in range(limit)]
        }
        
        df = pd.DataFrame(data)
        logger.warning("Using mock OHLCV data")
        return df
    
    async def get_current_price(self, pair: str) -> float:
        """Get current price for a trading pair."""
        try:
            # Check cache
            cache_key = f"price:{pair}"
            cached = await RedisClient.get(cache_key)
            
            if cached:
                return float(cached)
            
            # Fetch from service
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/market-data/price/{pair}"
                )
                response.raise_for_status()
                data = response.json()
                price = float(data['price'])
            
            # Cache for 10 seconds
            await RedisClient.set(cache_key, str(price), ttl=10)
            
            return price
        
        except Exception as e:
            logger.error("Failed to fetch current price", error=str(e), pair=pair)
            # Fallback to last price from OHLCV
            df = await self.get_ohlcv(pair, limit=1)
            return float(df['close'].iloc[-1])
    
    async def get_orderbook(self, pair: str, depth: int = 20) -> Dict:
        """Get orderbook data."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/market-data/orderbook/{pair}",
                    params={"depth": depth}
                )
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error("Failed to fetch orderbook", error=str(e), pair=pair)
            return {'bids': [], 'asks': []}
    
    async def get_trades(self, pair: str, limit: int = 100) -> List[Dict]:
        """Get recent trades."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/market-data/trades/{pair}",
                    params={"limit": limit}
                )
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error("Failed to fetch trades", error=str(e), pair=pair)
            return []
    
    async def get_market_summary(self, pair: str) -> Dict:
        """Get market summary with 24h stats."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/market-data/summary/{pair}"
                )
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error("Failed to fetch market summary", error=str(e), pair=pair)
            return {}
    
    async def search_news(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for news articles related to a trading pair or topic."""
        try:
            # In production, integrate with news API
            # For now, return mock data
            return self._generate_mock_news(query, limit)
        
        except Exception as e:
            logger.error("Failed to search news", error=str(e))
            return []
    
    def _generate_mock_news(self, query: str, limit: int) -> List[Dict]:
        """Generate mock news data."""
        news = [
            {
                'title': f'{query} shows strong momentum in latest trading',
                'description': 'Market analysis shows positive indicators...',
                'source': 'CoinDesk',
                'published_at': (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                'url': 'https://example.com/news1'
            },
            {
                'title': f'Analysts predict {query} breakout',
                'description': 'Technical analysis suggests potential upside...',
                'source': 'CoinTelegraph',
                'published_at': (datetime.utcnow() - timedelta(hours=5)).isoformat(),
                'url': 'https://example.com/news2'
            }
        ]
        return news[:limit]
    
    async def search_social_media(self, query: str, limit: int = 50) -> List[Dict]:
        """Search for social media posts."""
        try:
            # In production, integrate with Twitter/Reddit API
            return self._generate_mock_social(query, limit)
        
        except Exception as e:
            logger.error("Failed to search social media", error=str(e))
            return []
    
    def _generate_mock_social(self, query: str, limit: int) -> List[Dict]:
        """Generate mock social media data."""
        import random
        
        sentiments = [
            'Bullish on {query}! To the moon! 🚀',
            '{query} is looking strong today',
            'Bearish signals on {query}, be careful',
            'Just bought more {query}',
            '{query} breakout incoming?'
        ]
        
        posts = []
        for i in range(min(limit, len(sentiments) * 3)):
            posts.append({
                'text': random.choice(sentiments).format(query=query),
                'platform': 'twitter',
                'engagement': random.randint(10, 1000),
                'timestamp': (datetime.utcnow() - timedelta(hours=random.randint(1, 24))).isoformat()
            })
        
        return posts
