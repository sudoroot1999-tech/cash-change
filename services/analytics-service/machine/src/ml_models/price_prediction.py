"""
Price Prediction Model
LSTM-based model for short-term cryptocurrency price prediction with confidence intervals
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import mlflow
import mlflow.keras
from datetime import datetime, timedelta
import logging
import joblib
import psycopg2
from typing import Dict, List, Tuple, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PricePredictionModel:
    """
    LSTM model for cryptocurrency price prediction
    """
    
    def __init__(self, db_config: Dict[str, str], trading_pair: str = 'BTC/USDT'):
        self.db_config = db_config
        self.trading_pair = trading_pair
        self.model = None
        self.scaler = MinMaxScaler()
        self.lookback_periods = 60  # Use 60 periods to predict next period
        self.feature_columns = []
        
    def extract_price_data(self, days: int = 365) -> pd.DataFrame:
        """Extract historical price data with technical indicators"""
        logger.info(f"Extracting price data for {self.trading_pair}")
        
        conn = psycopg2.connect(**self.db_config)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        query = f"""
        WITH hourly_candles AS (
            SELECT 
                date_trunc('hour', timestamp) as hour,
                trading_pair,
                FIRST(price ORDER BY timestamp) as open,
                MAX(price) as high,
                MIN(price) as low,
                LAST(price ORDER BY timestamp) as close,
                SUM(amount) as volume,
                COUNT(*) as trade_count
            FROM trading_events
            WHERE trading_pair = %s
              AND timestamp >= %s
              AND timestamp <= %s
              AND status = 'completed'
            GROUP BY date_trunc('hour', timestamp), trading_pair
            ORDER BY hour
        )
        SELECT 
            hour as timestamp,
            open,
            high,
            low,
            close,
            volume,
            trade_count
        FROM hourly_candles
        ORDER BY hour
        """
        
        df = pd.read_sql(query, conn, params=(self.trading_pair, start_date, end_date))
        conn.close()
        
        if len(df) == 0:
            raise ValueError(f"No data found for {self.trading_pair}")
        
        logger.info(f"Extracted {len(df)} hourly candles")
        return df
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for price prediction"""
        logger.info("Calculating technical indicators")
        
        # Returns
        df['returns'] = df['close'].pct_change()
        
        # Moving averages
        df['sma_7'] = df['close'].rolling(window=7).mean()
        df['sma_25'] = df['close'].rolling(window=25).mean()
        df['sma_99'] = df['close'].rolling(window=99).mean()
        
        # Exponential moving averages
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_diff'] = df['macd'] - df['macd_signal']
        
        # RSI (Relative Strength Index)
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (df['bb_std'] * 2)
        df['bb_lower'] = df['bb_middle'] - (df['bb_std'] * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        
        # ATR (Average True Range)
        df['tr1'] = df['high'] - df['low']
        df['tr2'] = abs(df['high'] - df['close'].shift())
        df['tr3'] = abs(df['low'] - df['close'].shift())
        df['tr'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        df['atr'] = df['tr'].rolling(window=14).mean()
        
        # Volume indicators
        df['volume_sma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Price momentum
        df['momentum'] = df['close'] - df['close'].shift(4)
        df['rate_of_change'] = ((df['close'] - df['close'].shift(12)) / df['close'].shift(12)) * 100
        
        # Volatility
        df['volatility'] = df['returns'].rolling(window=20).std()
        
        # Time features
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
        df['month'] = pd.to_datetime(df['timestamp']).dt.month
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        # Drop intermediate columns
        df = df.drop(['tr1', 'tr2', 'tr3', 'tr', 'hour', 'day_of_week', 'month'], axis=1)
        
        # Fill NaN values
        df = df.fillna(method='bfill').fillna(method='ffill')
        
        return df
    
    def prepare_sequences(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare sequences for LSTM training"""
        logger.info("Preparing sequences for LSTM")
        
        # Select features
        feature_cols = [col for col in df.columns if col not in ['timestamp', 'close']]
        self.feature_columns = feature_cols + ['close']
        
        # Scale features
        scaled_data = self.scaler.fit_transform(df[self.feature_columns])
        
        # Create sequences
        X, y = [], []
        for i in range(self.lookback_periods, len(scaled_data)):
            X.append(scaled_data[i-self.lookback_periods:i])
            y.append(scaled_data[i, -1])  # Close price is the last column
        
        X, y = np.array(X), np.array(y)
        
        logger.info(f"Created {len(X)} sequences with shape {X.shape}")
        return X, y
    
    def build_lstm_model(self, input_shape: Tuple) -> keras.Model:
        """Build LSTM model architecture"""
        logger.info("Building LSTM model")
        
        model = keras.Sequential([
            layers.LSTM(128, return_sequences=True, input_shape=input_shape),
            layers.Dropout(0.2),
            layers.LSTM(64, return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(32, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='huber',  # Robust to outliers
            metrics=['mae', 'mse']
        )
        
        return model
    
    def train(self, epochs: int = 100, batch_size: int = 32) -> Dict:
        """Train the LSTM price prediction model"""
        logger.info(f"Training price prediction model for {self.trading_pair}")
        
        # Extract and prepare data
        df = self.extract_price_data()
        df = self.calculate_technical_indicators(df)
        
        X, y = self.prepare_sequences(df)
        
        # Split data (80% train, 20% test)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Start MLflow run
        with mlflow.start_run(run_name=f"price_prediction_{self.trading_pair}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            
            # Build model
            self.model = self.build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))
            
            # Callbacks
            early_stopping = keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True
            )
            
            reduce_lr = keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=0.00001
            )
            
            # Train
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=[early_stopping, reduce_lr],
                verbose=0
            )
            
            # Predictions
            y_pred_train = self.model.predict(X_train, verbose=0)
            y_pred_test = self.model.predict(X_test, verbose=0)
            
            # Inverse transform predictions
            y_train_actual = self.inverse_transform_predictions(y_train)
            y_pred_train_actual = self.inverse_transform_predictions(y_pred_train.flatten())
            y_test_actual = self.inverse_transform_predictions(y_test)
            y_pred_test_actual = self.inverse_transform_predictions(y_pred_test.flatten())
            
            # Calculate metrics
            train_mae = mean_absolute_error(y_train_actual, y_pred_train_actual)
            test_mae = mean_absolute_error(y_test_actual, y_pred_test_actual)
            train_rmse = np.sqrt(mean_squared_error(y_train_actual, y_pred_train_actual))
            test_rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred_test_actual))
            train_r2 = r2_score(y_train_actual, y_pred_train_actual)
            test_r2 = r2_score(y_test_actual, y_pred_test_actual)
            
            # Calculate MAPE (Mean Absolute Percentage Error)
            train_mape = np.mean(np.abs((y_train_actual - y_pred_train_actual) / y_train_actual)) * 100
            test_mape = np.mean(np.abs((y_test_actual - y_pred_test_actual) / y_test_actual)) * 100
            
            # Log parameters and metrics
            mlflow.log_param("trading_pair", self.trading_pair)
            mlflow.log_param("lookback_periods", self.lookback_periods)
            mlflow.log_param("epochs", epochs)
            mlflow.log_param("batch_size", batch_size)
            
            mlflow.log_metric("train_mae", train_mae)
            mlflow.log_metric("test_mae", test_mae)
            mlflow.log_metric("train_rmse", train_rmse)
            mlflow.log_metric("test_rmse", test_rmse)
            mlflow.log_metric("train_r2", train_r2)
            mlflow.log_metric("test_r2", test_r2)
            mlflow.log_metric("train_mape", train_mape)
            mlflow.log_metric("test_mape", test_mape)
            
            # Log model
            mlflow.keras.log_model(self.model, "model")
            mlflow.sklearn.log_model(self.scaler, "scaler")
            
            logger.info(f"Model trained successfully")
            logger.info(f"Test MAE: ${test_mae:.2f}, Test MAPE: {test_mape:.2f}%")
            logger.info(f"Test RMSE: ${test_rmse:.2f}, Test R²: {test_r2:.4f}")
            
            results = {
                'train_mae': train_mae,
                'test_mae': test_mae,
                'train_rmse': train_rmse,
                'test_rmse': test_rmse,
                'train_r2': train_r2,
                'test_r2': test_r2,
                'train_mape': train_mape,
                'test_mape': test_mape,
            }
            
            return results
    
    def inverse_transform_predictions(self, predictions: np.ndarray) -> np.ndarray:
        """Inverse transform scaled predictions back to original price scale"""
        # Create dummy array with same shape as scaler expects
        dummy = np.zeros((len(predictions), len(self.feature_columns)))
        dummy[:, -1] = predictions  # Close price is last column
        
        # Inverse transform
        inverse = self.scaler.inverse_transform(dummy)
        return inverse[:, -1]
    
    def predict(self, periods_ahead: int = 1) -> Dict:
        """Predict future prices"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Get recent data
        df = self.extract_price_data(days=90)
        df = self.calculate_technical_indicators(df)
        
        # Prepare last sequence
        scaled_data = self.scaler.transform(df[self.feature_columns].tail(self.lookback_periods))
        
        predictions = []
        current_sequence = scaled_data.reshape(1, self.lookback_periods, len(self.feature_columns))
        
        for _ in range(periods_ahead):
            # Predict next value
            pred = self.model.predict(current_sequence, verbose=0)[0, 0]
            predictions.append(pred)
            
            # Update sequence for next prediction
            # Create new row with predicted close price
            new_row = current_sequence[0, -1, :].copy()
            new_row[-1] = pred  # Update close price
            
            # Shift sequence and append new prediction
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, :] = new_row
        
        # Inverse transform predictions
        predictions_actual = self.inverse_transform_predictions(np.array(predictions))
        
        # Calculate confidence intervals (simple approach using historical volatility)
        recent_returns = df['returns'].tail(100)
        std_return = recent_returns.std()
        
        current_price = df['close'].iloc[-1]
        
        results = []
        for i, pred_price in enumerate(predictions_actual):
            # Confidence interval widens with prediction horizon
            horizon_factor = np.sqrt(i + 1)
            confidence_interval = pred_price * std_return * horizon_factor * 1.96  # 95% CI
            
            results.append({
                'periods_ahead': i + 1,
                'predicted_price': float(pred_price),
                'lower_bound': float(pred_price - confidence_interval),
                'upper_bound': float(pred_price + confidence_interval),
                'confidence': 0.95,
            })
        
        return {
            'trading_pair': self.trading_pair,
            'current_price': float(current_price),
            'predictions': results,
            'timestamp': datetime.now().isoformat(),
        }
    
    def save(self, filepath: str):
        """Save model to disk"""
        self.model.save(filepath)
        joblib.dump({
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'lookback_periods': self.lookback_periods,
            'trading_pair': self.trading_pair,
        }, filepath.replace('.h5', '_metadata.pkl'))
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk"""
        self.model = keras.models.load_model(filepath)
        metadata = joblib.load(filepath.replace('.h5', '_metadata.pkl'))
        self.scaler = metadata['scaler']
        self.feature_columns = metadata['feature_columns']
        self.lookback_periods = metadata['lookback_periods']
        self.trading_pair = metadata['trading_pair']
        logger.info(f"Model loaded from {filepath}")


def main():
    """Train and evaluate price prediction model"""
    
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'analytics',
        'user': 'analytics_user',
        'password': 'password',
    }
    
    # Train for major pairs
    pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']
    
    for pair in pairs:
        logger.info(f"\n{'='*50}")
        logger.info(f"Training model for {pair}")
        logger.info(f"{'='*50}")
        
        model = PricePredictionModel(db_config, trading_pair=pair)
        results = model.train(epochs=50)
        
        print(f"\n=== {pair} Price Prediction Results ===")
        print(f"Test MAE: ${results['test_mae']:.2f}")
        print(f"Test RMSE: ${results['test_rmse']:.2f}")
        print(f"Test MAPE: {results['test_mape']:.2f}%")
        print(f"Test R²: {results['test_r2']:.4f}")
        
        # Make predictions
        predictions = model.predict(periods_ahead=24)  # 24 hours ahead
        print(f"\nNext 24 hour predictions:")
        for pred in predictions[:5]:  # Show first 5
            print(f"  {pred['periods_ahead']}h: ${pred['predicted_price']:.2f} "
                  f"(${pred['lower_bound']:.2f} - ${pred['upper_bound']:.2f})")
        
        # Save model
        model.save(f'/tmp/price_prediction_{pair.replace("/", "_")}.h5')


if __name__ == '__main__':
    main()
