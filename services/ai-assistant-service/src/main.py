"""Main FastAPI application."""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
import asyncio
from datetime import datetime

from src.config import settings
from src.database import init_databases, close_databases
from src.routers import chat, signals, analysis, predictions, models, backtesting
from src.websocket import handle_websocket, heartbeat_task, signal_monitor_task, price_stream_task
from src.schemas import HealthCheck

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Background tasks
background_tasks = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting AI Assistant service", version=settings.model_version)
    
    try:
        # Initialize databases
        await init_databases()
        
        # Start background tasks
        background_tasks.append(asyncio.create_task(heartbeat_task()))
        background_tasks.append(asyncio.create_task(signal_monitor_task()))
        background_tasks.append(asyncio.create_task(price_stream_task()))
        
        logger.info("AI Assistant service started successfully")
    except Exception as e:
        logger.error("Failed to start service", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Assistant service")
    
    # Cancel background tasks
    for task in background_tasks:
        task.cancel()
    
    # Close databases
    await close_databases()
    
    logger.info("AI Assistant service stopped")


# Create FastAPI app
app = FastAPI(
    title="AI Trading Assistant",
    description="AI-powered trading assistant with natural language processing, market analysis, and predictive models",
    version=settings.model_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(signals.router)
app.include_router(analysis.router)
app.include_router(predictions.router)
app.include_router(models.router)
app.include_router(backtesting.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "service": "AI Trading Assistant",
        "version": settings.model_version,
        "status": "operational",
        "endpoints": {
            "chat": "/ai/chat",
            "signals": "/ai/signals/{pair}",
            "market_analysis": "/ai/market-analysis/{pair}",
            "portfolio_analysis": "/ai/analyze-portfolio",
            "predictions": "/ai/predictions/{pair}",
            "models": "/ai/models",
            "backtest": "/ai/backtest",
            "websocket": "/ai/signal-stream"
        },
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthCheck, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    from src.database import MongoDB, RedisClient, engine
    
    # Check database connections
    databases = {}
    
    # PostgreSQL
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        databases['postgresql'] = 'healthy'
    except Exception as e:
        databases['postgresql'] = f'unhealthy: {str(e)}'
    
    # MongoDB
    try:
        if MongoDB.client:
            await MongoDB.client.admin.command('ping')
            databases['mongodb'] = 'healthy'
        else:
            databases['mongodb'] = 'not_connected'
    except Exception as e:
        databases['mongodb'] = f'unhealthy: {str(e)}'
    
    # Redis
    try:
        if RedisClient.client:
            await RedisClient.client.ping()
            databases['redis'] = 'healthy'
        else:
            databases['redis'] = 'not_connected'
    except Exception as e:
        databases['redis'] = f'unhealthy: {str(e)}'
    
    # Check models
    models_status = {}
    try:
        from src.database import get_db
        from src.services.model_manager import ModelManager
        from src.models import ModelType
        
        model_manager = ModelManager()
        
        async for db in get_db():
            for model_type in ModelType:
                model = await model_manager.select_model(db, model_type)
                if model:
                    models_status[model_type.value] = f'v{model.version}'
                else:
                    models_status[model_type.value] = 'not_available'
            break
    except Exception as e:
        models_status['error'] = str(e)
    
    # Determine overall status
    all_healthy = all(status == 'healthy' for status in databases.values())
    overall_status = 'healthy' if all_healthy else 'degraded'
    
    return HealthCheck(
        status=overall_status,
        service=settings.service_name,
        version=settings.model_version,
        timestamp=datetime.utcnow(),
        databases=databases,
        models=models_status
    )


@app.websocket("/ai/signal-stream")
async def websocket_endpoint(websocket: WebSocket, client_id: str = None):
    """
    WebSocket endpoint for real-time signal streaming.
    
    Usage:
    ```javascript
    const ws = new WebSocket('ws://localhost:8005/ai/signal-stream?client_id=user123');
    
    // Subscribe to pairs
    ws.send(JSON.stringify({
        type: 'subscribe',
        data: {
            pairs: ['BTC/USD', 'ETH/USD'],
            signal_types: ['buy', 'sell'],
            min_confidence: 0.7
        }
    }));
    
    // Receive signals
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(message);
    };
    ```
    """
    if not client_id:
        import uuid
        client_id = str(uuid.uuid4())
    
    await handle_websocket(websocket, client_id)


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return {
        "error": "Not Found",
        "detail": "The requested resource was not found",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error("Internal server error", error=str(exc))
    return {
        "error": "Internal Server Error",
        "detail": "An unexpected error occurred",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
        log_level=settings.log_level.lower()
    )
