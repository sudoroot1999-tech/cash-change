"""Script to train LSTM model."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.lstm_model import LSTMPredictor
from src.services.market_data import MarketDataService
from src.services.model_manager import ModelManager
from src.database import init_databases, close_databases, get_db
from src.models import ModelType
import structlog

logger = structlog.get_logger()


async def train_lstm_model(pair: str = "BTC/USD", epochs: int = 100):
    """
    Train LSTM model for price prediction.
    
    Args:
        pair: Trading pair
        epochs: Number of training epochs
    """
    try:
        # Initialize databases
        await init_databases()
        
        logger.info("Fetching market data", pair=pair)
        market_service = MarketDataService()
        df = await market_service.get_ohlcv(pair, timeframe="1h", limit=2000)
        
        logger.info("Data fetched", rows=len(df))
        
        # Split into train/test
        train_size = int(len(df) * 0.8)
        train_df = df[:train_size]
        test_df = df[train_size:]
        
        logger.info("Training LSTM model", train_size=len(train_df), test_size=len(test_df))
        
        # Initialize predictor
        predictor = LSTMPredictor(
            lookback=60,
            hidden_size=64,
            num_layers=2
        )
        
        # Build and train
        predictor.build_model()
        metrics = predictor.train(
            train_df,
            epochs=epochs,
            batch_size=32,
            learning_rate=0.001
        )
        
        logger.info("Training completed", **metrics)
        
        # Evaluate on test set
        eval_metrics = predictor.evaluate(test_df)
        logger.info("Evaluation metrics", **eval_metrics)
        
        # Save model
        model_path = f"./models/lstm/{pair.replace('/', '_').lower()}_v1.pt"
        predictor.save_model(model_path)
        logger.info("Model saved", path=model_path)
        
        # Register model in database
        async for db in get_db():
            model_manager = ModelManager()
            
            model = await model_manager.register_model(
                db=db,
                name=f"LSTM_{pair}",
                model_type=ModelType.LSTM,
                version="1.0.0",
                description=f"LSTM price predictor for {pair}",
                hyperparameters={
                    'lookback': 60,
                    'hidden_size': 64,
                    'num_layers': 2,
                    'epochs': epochs
                },
                metrics=eval_metrics,
                file_path=model_path
            )
            
            logger.info("Model registered", model_id=str(model.id))
            
            # Log to MLflow
            mlflow_params = {
                'pair': pair,
                'lookback': 60,
                'hidden_size': 64,
                'num_layers': 2,
                'epochs': epochs
            }
            
            run_id = model_manager.log_to_mlflow(
                model_name=f"LSTM_{pair}",
                params=mlflow_params,
                metrics=eval_metrics,
                artifacts={'model': model_path}
            )
            
            logger.info("Logged to MLflow", run_id=run_id)
            break
        
        # Close databases
        await close_databases()
        
        logger.info("Training complete!")
        
    except Exception as e:
        logger.error("Training failed", error=str(e))
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train LSTM model")
    parser.add_argument("--pair", type=str, default="BTC/USD", help="Trading pair")
    parser.add_argument("--epochs", type=int, default=100, help="Number of epochs")
    
    args = parser.parse_args()
    
    asyncio.run(train_lstm_model(args.pair, args.epochs))
