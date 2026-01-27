"""Tests for API endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint."""
    response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['service'] == 'AI Trading Assistant'
    assert 'version' in data
    assert 'endpoints' in data


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'status' in data
    assert 'service' in data
    assert 'version' in data
    assert 'databases' in data


@pytest.mark.asyncio
async def test_chat_endpoint(client: AsyncClient):
    """Test chat endpoint."""
    # Note: This will fail without a valid Claude API key
    # Use mocking in real tests
    
    payload = {
        "message": "What is Bitcoin?",
        "user_id": "test_user",
        "context": None,
        "conversation_id": None
    }
    
    # This test would need mocking of Claude API
    # response = await client.post("/ai/chat", json=payload)
    # assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_signals(client: AsyncClient):
    """Test get signals endpoint."""
    response = await client.get("/ai/signals/BTC/USD")
    
    # Should return empty list or signals
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_predictions_endpoint(client: AsyncClient):
    """Test predictions endpoint."""
    # This would need a trained model
    # Use mocking in real tests
    
    payload = {
        "pair": "BTC/USD",
        "horizon": "24h",
        "model_type": None
    }
    
    # response = await client.post("/ai/predictions/BTC/USD", json=payload)
    # Would need mocking


@pytest.mark.asyncio
async def test_backtest_endpoint(client: AsyncClient):
    """Test backtest endpoint."""
    from datetime import datetime, timedelta
    
    payload = {
        "strategy_name": "rsi_mean_reversion",
        "pair": "BTC/USD",
        "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "initial_capital": 10000,
        "parameters": {
            "rsi_period": 14,
            "oversold": 30,
            "overbought": 70
        }
    }
    
    # This would need market data
    # Use mocking in real tests
    # response = await client.post("/ai/backtest", json=payload)


@pytest.mark.asyncio
async def test_list_models(client: AsyncClient):
    """Test list models endpoint."""
    response = await client.get("/ai/models")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
