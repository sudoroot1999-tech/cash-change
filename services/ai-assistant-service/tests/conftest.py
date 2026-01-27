"""Pytest configuration and fixtures."""
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from src.main import app
from src.database import Base, get_db
from src.config import settings


# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_assistant_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client."""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_ohlcv_data():
    """Sample OHLCV data for testing."""
    import pandas as pd
    import numpy as np
    from datetime import datetime, timedelta
    
    dates = [datetime.utcnow() - timedelta(hours=i) for i in range(100)]
    dates.reverse()
    
    prices = [50000 + np.random.normal(0, 500) for _ in range(100)]
    
    df = pd.DataFrame({
        'timestamp': dates,
        'open': prices,
        'high': [p * 1.01 for p in prices],
        'low': [p * 0.99 for p in prices],
        'close': [p * (1 + np.random.normal(0, 0.005)) for p in prices],
        'volume': [np.random.uniform(1000000, 5000000) for _ in range(100)]
    })
    
    return df
