"""LSTM model for price prediction."""
import numpy as np
import pandas as pd
from typing import Tuple, Optional, Dict
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
import structlog

logger = structlog.get_logger()


class LSTMModel(nn.Module):
    """LSTM neural network for time series prediction."""
    
    def __init__(self, input_size: int = 5, hidden_size: int = 64, 
                 num_layers: int = 2, dropout: float = 0.2, output_size: int = 1):
        """Initialize LSTM model."""
        super(LSTMModel, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True
        )
        
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        """Forward pass."""
        # Initialize hidden state and cell state
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # LSTM forward
        out, _ = self.lstm(x, (h0, c0))
        
        # Take the output from the last time step
        out = self.fc(out[:, -1, :])
        return out


class LSTMPredictor:
    """LSTM-based price predictor."""
    
    def __init__(self, model_path: Optional[str] = None, 
                 lookback: int = 60, hidden_size: int = 64, 
                 num_layers: int = 2):
        """Initialize LSTM predictor."""
        self.lookback = lookback
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        if model_path:
            self.load_model(model_path)
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare data for LSTM training.
        
        Args:
            df: DataFrame with OHLCV data
        
        Returns:
            Tuple of (X, y) arrays
        """
        # Select features
        features = ['open', 'high', 'low', 'close', 'volume']
        data = df[features].values
        
        # Scale data
        scaled_data = self.scaler.fit_transform(data)
        
        # Create sequences
        X, y = [], []
        for i in range(self.lookback, len(scaled_data)):
            X.append(scaled_data[i - self.lookback:i])
            y.append(scaled_data[i, 3])  # Close price
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_size: int = 5):
        """Build LSTM model."""
        self.model = LSTMModel(
            input_size=input_size,
            hidden_size=self.hidden_size,
            num_layers=self.num_layers,
            output_size=1
        ).to(self.device)
        
        logger.info("LSTM model built", 
                   hidden_size=self.hidden_size, 
                   num_layers=self.num_layers)
    
    def train(self, df: pd.DataFrame, epochs: int = 100, 
              batch_size: int = 32, learning_rate: float = 0.001) -> Dict:
        """
        Train LSTM model.
        
        Args:
            df: Training data
            epochs: Number of training epochs
            batch_size: Batch size
            learning_rate: Learning rate
        
        Returns:
            Training metrics
        """
        try:
            # Prepare data
            X, y = self.prepare_data(df)
            
            # Build model if not exists
            if self.model is None:
                self.build_model(input_size=X.shape[2])
            
            # Convert to tensors
            X_tensor = torch.FloatTensor(X).to(self.device)
            y_tensor = torch.FloatTensor(y).unsqueeze(1).to(self.device)
            
            # Loss and optimizer
            criterion = nn.MSELoss()
            optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
            
            # Training loop
            losses = []
            self.model.train()
            
            for epoch in range(epochs):
                epoch_loss = 0.0
                
                for i in range(0, len(X_tensor), batch_size):
                    batch_X = X_tensor[i:i + batch_size]
                    batch_y = y_tensor[i:i + batch_size]
                    
                    # Forward pass
                    outputs = self.model(batch_X)
                    loss = criterion(outputs, batch_y)
                    
                    # Backward pass
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / (len(X_tensor) / batch_size)
                losses.append(avg_loss)
                
                if (epoch + 1) % 10 == 0:
                    logger.info(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}")
            
            metrics = {
                'final_loss': losses[-1],
                'min_loss': min(losses),
                'epochs': epochs,
                'samples': len(X),
            }
            
            logger.info("LSTM training completed", **metrics)
            return metrics
        
        except Exception as e:
            logger.error("LSTM training failed", error=str(e))
            raise
    
    def predict(self, df: pd.DataFrame, horizon: str = "24h") -> Dict:
        """
        Make price predictions.
        
        Args:
            df: Historical data
            horizon: Prediction horizon (e.g., "1h", "24h", "7d")
        
        Returns:
            Prediction results
        """
        try:
            if self.model is None:
                raise ValueError("Model not trained or loaded")
            
            # Prepare input data
            features = ['open', 'high', 'low', 'close', 'volume']
            data = df[features].tail(self.lookback).values
            scaled_data = self.scaler.transform(data)
            
            # Convert to tensor
            X = torch.FloatTensor(scaled_data).unsqueeze(0).to(self.device)
            
            # Make prediction
            self.model.eval()
            with torch.no_grad():
                prediction_scaled = self.model(X).cpu().numpy()
            
            # Inverse transform prediction
            # Create dummy array with same shape for inverse transform
            dummy = np.zeros((1, 5))
            dummy[0, 3] = prediction_scaled[0, 0]
            prediction = self.scaler.inverse_transform(dummy)[0, 3]
            
            current_price = float(df['close'].iloc[-1])
            predicted_price = float(prediction)
            
            # Calculate confidence based on recent volatility
            recent_returns = df['close'].pct_change().tail(20)
            volatility = float(recent_returns.std())
            confidence = max(0.5, min(0.9, 1.0 - (volatility * 10)))
            
            # Calculate prediction intervals (simple approach)
            prediction_std = current_price * volatility * 2
            lower_bound = predicted_price - prediction_std
            upper_bound = predicted_price + prediction_std
            
            return {
                'current_price': current_price,
                'predicted_price': predicted_price,
                'price_change': predicted_price - current_price,
                'price_change_pct': ((predicted_price - current_price) / current_price) * 100,
                'confidence': round(confidence, 2),
                'lower_bound': round(lower_bound, 2),
                'upper_bound': round(upper_bound, 2),
                'horizon': horizon,
                'volatility': round(volatility, 4),
            }
        
        except Exception as e:
            logger.error("LSTM prediction failed", error=str(e))
            raise
    
    def save_model(self, path: str):
        """Save model to file."""
        if self.model is None:
            raise ValueError("No model to save")
        
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'scaler': self.scaler,
            'lookback': self.lookback,
            'hidden_size': self.hidden_size,
            'num_layers': self.num_layers,
        }, path)
        
        logger.info("Model saved", path=path)
    
    def load_model(self, path: str):
        """Load model from file."""
        try:
            checkpoint = torch.load(path, map_location=self.device)
            
            self.lookback = checkpoint['lookback']
            self.hidden_size = checkpoint['hidden_size']
            self.num_layers = checkpoint['num_layers']
            self.scaler = checkpoint['scaler']
            
            self.build_model()
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            
            logger.info("Model loaded", path=path)
        except Exception as e:
            logger.error("Model loading failed", error=str(e), path=path)
            raise
    
    def evaluate(self, df: pd.DataFrame) -> Dict:
        """Evaluate model on test data."""
        try:
            X, y_true = self.prepare_data(df)
            
            X_tensor = torch.FloatTensor(X).to(self.device)
            
            self.model.eval()
            with torch.no_grad():
                y_pred = self.model(X_tensor).cpu().numpy().flatten()
            
            # Calculate metrics
            mse = np.mean((y_true - y_pred) ** 2)
            rmse = np.sqrt(mse)
            mae = np.mean(np.abs(y_true - y_pred))
            
            # R-squared
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            return {
                'mse': float(mse),
                'rmse': float(rmse),
                'mae': float(mae),
                'r2': float(r2),
                'samples': len(y_true),
            }
        
        except Exception as e:
            logger.error("Model evaluation failed", error=str(e))
            raise
