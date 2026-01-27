"""Price prediction endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
import structlog
import time

from src.schemas import PredictionRequest, PredictionResponse
from src.models import Prediction, ModelType
from src.services.lstm_model import LSTMPredictor
from src.services.market_data import MarketDataService
from src.services.model_manager import ModelManager
from src.database import get_db
from src.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/ai/predictions", tags=["Predictions"])


@router.post("/{pair}", response_model=PredictionResponse)
async def predict_price(
    pair: str,
    request: PredictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Predict future price for a trading pair.
    
    Uses LSTM model to predict price at specified horizon.
    """
    try:
        start_time = time.time()
        
        # Get model
        model_manager = ModelManager()
        model = await model_manager.select_model(db, ModelType.LSTM)
        
        if not model:
            raise HTTPException(status_code=503, detail="No LSTM model available")
        
        # Fetch market data
        market_service = MarketDataService()
        df = await market_service.get_ohlcv(pair, timeframe="1h", limit=200)
        current_price = await market_service.get_current_price(pair)
        
        # Load and predict
        predictor = LSTMPredictor(model_path=model.file_path)
        
        # If model not trained, train it
        if predictor.model is None:
            logger.info("Training LSTM model on the fly")
            predictor.build_model()
            predictor.train(df, epochs=50, batch_size=32)
        
        prediction_result = predictor.predict(df, horizon=request.horizon)
        
        # Parse horizon to datetime
        from datetime import datetime, timedelta
        
        horizon_value = int(request.horizon[:-1])
        horizon_unit = request.horizon[-1]
        
        if horizon_unit == 'h':
            predicted_at = datetime.utcnow() + timedelta(hours=horizon_value)
        elif horizon_unit == 'd':
            predicted_at = datetime.utcnow() + timedelta(days=horizon_value)
        elif horizon_unit == 'w':
            predicted_at = datetime.utcnow() + timedelta(weeks=horizon_value)
        elif horizon_unit == 'm':
            predicted_at = datetime.utcnow() + timedelta(days=horizon_value * 30)
        else:
            predicted_at = datetime.utcnow() + timedelta(hours=24)
        
        # Save prediction
        prediction = Prediction(
            pair=pair,
            model_type=ModelType.LSTM,
            model_version=model.version,
            current_price=current_price,
            predicted_price=prediction_result['predicted_price'],
            prediction_horizon=request.horizon,
            confidence=prediction_result['confidence'],
            lower_bound=prediction_result['lower_bound'],
            upper_bound=prediction_result['upper_bound'],
            features_used={
                'lookback': predictor.lookback,
                'features': ['open', 'high', 'low', 'close', 'volume']
            },
            model_metrics={'volatility': prediction_result['volatility']},
            predicted_at=predicted_at
        )
        
        db.add(prediction)
        await db.commit()
        await db.refresh(prediction)
        
        # Log prediction
        latency_ms = (time.time() - start_time) * 1000
        await model_manager.log_prediction(
            db=db,
            model_id=str(model.id),
            model_version=model.version,
            pair=pair,
            input_features={'horizon': request.horizon},
            prediction=prediction_result,
            confidence=prediction_result['confidence'],
            latency_ms=latency_ms
        )
        
        logger.info("Price prediction generated",
                   pair=pair,
                   predicted_price=prediction_result['predicted_price'],
                   confidence=prediction_result['confidence'])
        
        return PredictionResponse(
            id=str(prediction.id),
            pair=prediction.pair,
            model_type=prediction.model_type,
            model_version=prediction.model_version,
            current_price=prediction.current_price,
            predicted_price=prediction.predicted_price,
            prediction_horizon=prediction.prediction_horizon,
            confidence=prediction.confidence,
            lower_bound=prediction.lower_bound,
            upper_bound=prediction.upper_bound,
            created_at=prediction.created_at,
            predicted_at=prediction.predicted_at
        )
    
    except Exception as e:
        logger.error("Price prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{pair}/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    pair: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get historical predictions for a pair."""
    try:
        result = await db.execute(
            select(Prediction)
            .where(Prediction.pair == pair)
            .order_by(desc(Prediction.created_at))
            .limit(limit)
        )
        predictions = result.scalars().all()
        
        return [
            PredictionResponse(
                id=str(p.id),
                pair=p.pair,
                model_type=p.model_type,
                model_version=p.model_version,
                current_price=p.current_price,
                predicted_price=p.predicted_price,
                prediction_horizon=p.prediction_horizon,
                confidence=p.confidence,
                lower_bound=p.lower_bound,
                upper_bound=p.upper_bound,
                created_at=p.created_at,
                predicted_at=p.predicted_at
            )
            for p in predictions
        ]
    
    except Exception as e:
        logger.error("Failed to get prediction history", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
