"""
Fraud Detection Model
Combines Isolation Forest for anomaly detection and Neural Network for pattern recognition
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import mlflow
import mlflow.sklearn
import mlflow.keras
from datetime import datetime, timedelta
import logging
import joblib
import psycopg2
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FraudDetectionModel:
    """
    Multi-model fraud detection system combining anomaly detection and deep learning
    """
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.isolation_forest = None
        self.neural_network = None
        self.scaler = RobustScaler()
        self.feature_names = []
        self.fraud_threshold = 0.7
        
    def extract_transaction_features(self, days: int = 30) -> pd.DataFrame:
        """Extract features for fraud detection"""
        logger.info(f"Extracting transaction features (last {days} days)")
        
        conn = psycopg2.connect(**self.db_config)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        query = f"""
        WITH user_profile AS (
            SELECT 
                u.id as user_id,
                EXTRACT(DAY FROM NOW() - u.created_at) as account_age_days,
                u.kyc_status,
                u.kyc_level,
                u.country_code,
                u.risk_level,
                COUNT(DISTINCT d.id) as device_count,
                COUNT(DISTINCT l.ip_address) as ip_count
            FROM users u
            LEFT JOIN user_devices d ON u.id = d.user_id
            LEFT JOIN user_login_history l ON u.id = l.user_id
            GROUP BY u.id, u.created_at, u.kyc_status, u.kyc_level, u.country_code, u.risk_level
        ),
        transaction_stats AS (
            SELECT 
                user_id,
                COUNT(*) as total_transactions,
                SUM(amount) as total_volume,
                AVG(amount) as avg_amount,
                STDDEV(amount) as stddev_amount,
                MAX(amount) as max_amount,
                MIN(amount) as min_amount,
                COUNT(DISTINCT currency) as currency_diversity,
                
                -- Temporal patterns
                COUNT(CASE WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 0 AND 6 THEN 1 END) as night_transactions,
                COUNT(CASE WHEN EXTRACT(DOW FROM timestamp) IN (0, 6) THEN 1 END) as weekend_transactions,
                
                -- Transaction types
                COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
                COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) as deposit_count,
                SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
                SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
                
                -- Failed transactions
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END)::float / COUNT(*) as failure_rate,
                
                -- Velocity metrics
                COUNT(*) / EXTRACT(DAY FROM MAX(timestamp) - MIN(timestamp) + INTERVAL '1 day')::float as txn_per_day,
                AVG(EXTRACT(EPOCH FROM timestamp - LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp)))::float as avg_time_between_txn
                
            FROM transaction_events
            WHERE timestamp BETWEEN '{start_date}'::timestamp AND '{end_date}'::timestamp
            GROUP BY user_id
        ),
        trading_patterns AS (
            SELECT 
                user_id,
                COUNT(*) as trade_count,
                SUM(amount) as trade_volume,
                COUNT(DISTINCT trading_pair) as pairs_traded,
                AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as trade_success_rate,
                
                -- Rapid trading
                COUNT(*) / EXTRACT(DAY FROM MAX(timestamp) - MIN(timestamp) + INTERVAL '1 day')::float as trades_per_day,
                
                -- Large trades
                COUNT(CASE WHEN amount > (SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY amount) FROM trading_events) THEN 1 END) as large_trade_count
                
            FROM trading_events
            WHERE timestamp BETWEEN '{start_date}'::timestamp AND '{end_date}'::timestamp
            GROUP BY user_id
        ),
        behavioral_flags AS (
            SELECT 
                user_id,
                -- Multiple withdrawal attempts
                COUNT(CASE WHEN event_type = 'withdrawal_failed' THEN 1 END) as failed_withdrawal_attempts,
                
                -- Rapid account changes
                COUNT(CASE WHEN event_type IN ('password_changed', 'email_changed', '2fa_disabled') THEN 1 END) as security_changes,
                
                -- Geographic anomalies
                COUNT(DISTINCT CASE WHEN event_type = 'login' THEN 
                    jsonb_extract_path_text(properties::jsonb, 'country_code') END) as login_countries,
                
                -- Device switching
                COUNT(DISTINCT CASE WHEN event_type = 'login' THEN 
                    jsonb_extract_path_text(properties::jsonb, 'device_id') END) as login_devices
                
            FROM user_events
            WHERE timestamp BETWEEN '{start_date}'::timestamp AND '{end_date}'::timestamp
            GROUP BY user_id
        )
        SELECT 
            up.*,
            COALESCE(ts.total_transactions, 0) as total_transactions,
            COALESCE(ts.total_volume, 0) as total_volume,
            COALESCE(ts.avg_amount, 0) as avg_amount,
            COALESCE(ts.stddev_amount, 0) as stddev_amount,
            COALESCE(ts.max_amount, 0) as max_amount,
            COALESCE(ts.min_amount, 0) as min_amount,
            COALESCE(ts.currency_diversity, 0) as currency_diversity,
            COALESCE(ts.night_transactions, 0) as night_transactions,
            COALESCE(ts.weekend_transactions, 0) as weekend_transactions,
            COALESCE(ts.withdrawal_count, 0) as withdrawal_count,
            COALESCE(ts.deposit_count, 0) as deposit_count,
            COALESCE(ts.total_withdrawals, 0) as total_withdrawals,
            COALESCE(ts.total_deposits, 0) as total_deposits,
            COALESCE(ts.failed_count, 0) as failed_count,
            COALESCE(ts.failure_rate, 0) as failure_rate,
            COALESCE(ts.txn_per_day, 0) as txn_per_day,
            COALESCE(ts.avg_time_between_txn, 0) as avg_time_between_txn,
            COALESCE(tp.trade_count, 0) as trade_count,
            COALESCE(tp.trade_volume, 0) as trade_volume,
            COALESCE(tp.pairs_traded, 0) as pairs_traded,
            COALESCE(tp.trade_success_rate, 0) as trade_success_rate,
            COALESCE(tp.trades_per_day, 0) as trades_per_day,
            COALESCE(tp.large_trade_count, 0) as large_trade_count,
            COALESCE(bf.failed_withdrawal_attempts, 0) as failed_withdrawal_attempts,
            COALESCE(bf.security_changes, 0) as security_changes,
            COALESCE(bf.login_countries, 0) as login_countries,
            COALESCE(bf.login_devices, 0) as login_devices,
            
            -- Label (for training): users with known fraud cases
            CASE WHEN EXISTS (
                SELECT 1 FROM fraud_cases fc 
                WHERE fc.user_id = up.user_id AND fc.status = 'confirmed'
            ) THEN 1 ELSE 0 END as is_fraud
            
        FROM user_profile up
        LEFT JOIN transaction_stats ts ON up.user_id = ts.user_id
        LEFT JOIN trading_patterns tp ON up.user_id = tp.user_id
        LEFT JOIN behavioral_flags bf ON up.user_id = bf.user_id
        WHERE up.account_age_days > 0
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        logger.info(f"Extracted {len(df)} user records")
        if 'is_fraud' in df.columns:
            logger.info(f"Fraud rate: {df['is_fraud'].mean():.4%}")
        
        return df
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create fraud detection features"""
        logger.info("Engineering fraud detection features")
        
        # Encode categorical features
        df['kyc_verified'] = (df['kyc_status'] == 'verified').astype(int)
        df['kyc_level_num'] = df['kyc_level'].fillna(0)
        
        # Risk indicators
        df['withdrawal_deposit_ratio'] = df['total_withdrawals'] / (df['total_deposits'] + 1)
        df['night_transaction_ratio'] = df['night_transactions'] / (df['total_transactions'] + 1)
        df['weekend_transaction_ratio'] = df['weekend_transactions'] / (df['total_transactions'] + 1)
        
        # Velocity indicators
        df['is_high_velocity'] = (df['txn_per_day'] > df['txn_per_day'].quantile(0.95)).astype(int)
        df['is_rapid_trader'] = (df['trades_per_day'] > df['trades_per_day'].quantile(0.95)).astype(int)
        
        # Anomaly indicators
        df['amount_volatility'] = df['stddev_amount'] / (df['avg_amount'] + 1)
        df['max_to_avg_ratio'] = df['max_amount'] / (df['avg_amount'] + 1)
        df['has_large_trades'] = (df['large_trade_count'] > 0).astype(int)
        
        # Behavioral red flags
        df['multiple_failed_withdrawals'] = (df['failed_withdrawal_attempts'] > 2).astype(int)
        df['frequent_security_changes'] = (df['security_changes'] > 1).astype(int)
        df['geographic_anomaly'] = (df['login_countries'] > 3).astype(int)
        df['device_switching'] = (df['login_devices'] > 3).astype(int)
        
        # New account indicators
        df['is_new_account'] = (df['account_age_days'] < 7).astype(int)
        df['early_large_transactions'] = ((df['account_age_days'] < 7) & 
                                          (df['max_amount'] > df['max_amount'].quantile(0.9))).astype(int)
        
        # Fill missing values
        df = df.fillna(0)
        
        return df
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Prepare features for training"""
        
        # Define feature columns
        exclude_cols = ['user_id', 'kyc_status', 'country_code', 'risk_level', 'is_fraud']
        feature_cols = [col for col in df.columns if col not in exclude_cols and df[col].dtype in ['int64', 'float64']]
        
        X = df[feature_cols].values
        y = df['is_fraud'].values if 'is_fraud' in df.columns else None
        
        self.feature_names = feature_cols
        
        return X, y, feature_cols
    
    def train_isolation_forest(self, X: np.ndarray) -> IsolationForest:
        """Train Isolation Forest for anomaly detection"""
        logger.info("Training Isolation Forest")
        
        model = IsolationForest(
            n_estimators=200,
            contamination=0.1,  # Expected fraud rate
            max_samples='auto',
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X)
        
        logger.info("Isolation Forest trained")
        return model
    
    def build_neural_network(self, input_dim: int) -> keras.Model:
        """Build deep learning model for fraud pattern recognition"""
        logger.info("Building neural network")
        
        model = keras.Sequential([
            layers.Input(shape=(input_dim,)),
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc'), 
                    keras.metrics.Precision(name='precision'),
                    keras.metrics.Recall(name='recall')]
        )
        
        return model
    
    def train(self) -> Dict:
        """Train both anomaly detection and pattern recognition models"""
        logger.info("Starting fraud detection model training")
        
        # Extract and engineer features
        df = self.extract_transaction_features()
        df = self.engineer_features(df)
        
        X, y, feature_names = self.prepare_data(df)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Start MLflow run
        with mlflow.start_run(run_name=f"fraud_detection_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            
            # Train Isolation Forest (unsupervised)
            self.isolation_forest = self.train_isolation_forest(X_scaled)
            anomaly_scores = -self.isolation_forest.score_samples(X_scaled)
            
            mlflow.sklearn.log_model(self.isolation_forest, "isolation_forest")
            
            # Train Neural Network if we have labeled data
            if y is not None and y.sum() > 10:
                logger.info("Training neural network with labeled data")
                
                # Handle class imbalance
                from sklearn.utils import class_weight
                class_weights = class_weight.compute_class_weight(
                    'balanced',
                    classes=np.unique(y),
                    y=y
                )
                class_weight_dict = {0: class_weights[0], 1: class_weights[1]}
                
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42, stratify=y
                )
                
                # Build and train model
                self.neural_network = self.build_neural_network(X_scaled.shape[1])
                
                early_stopping = keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True
                )
                
                history = self.neural_network.fit(
                    X_train, y_train,
                    validation_data=(X_test, y_test),
                    epochs=100,
                    batch_size=32,
                    class_weight=class_weight_dict,
                    callbacks=[early_stopping],
                    verbose=0
                )
                
                # Evaluate
                y_pred_proba = self.neural_network.predict(X_test, verbose=0).flatten()
                y_pred = (y_pred_proba >= 0.5).astype(int)
                
                from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
                
                auc_score = roc_auc_score(y_test, y_pred_proba)
                conf_matrix = confusion_matrix(y_test, y_pred)
                class_report = classification_report(y_test, y_pred, output_dict=True)
                
                # Log metrics
                mlflow.log_metric("nn_auc_score", auc_score)
                mlflow.log_metric("nn_precision", class_report['1']['precision'])
                mlflow.log_metric("nn_recall", class_report['1']['recall'])
                mlflow.log_metric("nn_f1_score", class_report['1']['f1-score'])
                
                # Log model
                mlflow.keras.log_model(self.neural_network, "neural_network")
                
                logger.info(f"Neural network trained. AUC: {auc_score:.4f}")
                
                results = {
                    'has_nn': True,
                    'auc_score': auc_score,
                    'precision': class_report['1']['precision'],
                    'recall': class_report['1']['recall'],
                    'f1_score': class_report['1']['f1-score'],
                    'confusion_matrix': conf_matrix.tolist(),
                }
            else:
                logger.info("Insufficient labeled data for neural network training")
                results = {'has_nn': False}
            
            # Log scaler
            mlflow.sklearn.log_model(self.scaler, "scaler")
            
            # Anomaly detection stats
            results['anomaly_detection'] = {
                'mean_anomaly_score': float(anomaly_scores.mean()),
                'std_anomaly_score': float(anomaly_scores.std()),
                'anomalies_detected': int((anomaly_scores > anomaly_scores.quantile(0.9)).sum()),
            }
            
            mlflow.log_metrics(results['anomaly_detection'])
            
            return results
    
    def predict(self, transaction_data: pd.DataFrame) -> pd.DataFrame:
        """Predict fraud probability for transactions"""
        if self.isolation_forest is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Engineer features
        data_processed = self.engineer_features(transaction_data)
        
        # Prepare features
        X = data_processed[self.feature_names].values
        X_scaled = self.scaler.transform(X)
        
        # Get anomaly scores
        anomaly_scores = -self.isolation_forest.score_samples(X_scaled)
        anomaly_scores_norm = (anomaly_scores - anomaly_scores.min()) / (anomaly_scores.max() - anomaly_scores.min())
        
        # Get neural network predictions if available
        if self.neural_network is not None:
            nn_scores = self.neural_network.predict(X_scaled, verbose=0).flatten()
            # Ensemble: weighted average
            fraud_scores = 0.4 * anomaly_scores_norm + 0.6 * nn_scores
        else:
            fraud_scores = anomaly_scores_norm
        
        # Add predictions
        transaction_data['fraud_score'] = fraud_scores
        transaction_data['is_fraud'] = (fraud_scores >= self.fraud_threshold).astype(int)
        transaction_data['risk_level'] = pd.cut(
            fraud_scores,
            bins=[0, 0.3, 0.6, 1.0],
            labels=['Low', 'Medium', 'High']
        )
        
        return transaction_data[['user_id', 'fraud_score', 'is_fraud', 'risk_level']]
    
    def save(self, filepath: str):
        """Save model to disk"""
        joblib.dump({
            'isolation_forest': self.isolation_forest,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'fraud_threshold': self.fraud_threshold,
        }, filepath)
        
        if self.neural_network is not None:
            self.neural_network.save(filepath.replace('.pkl', '_nn.h5'))
        
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk"""
        data = joblib.load(filepath)
        self.isolation_forest = data['isolation_forest']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.fraud_threshold = data['fraud_threshold']
        
        nn_path = filepath.replace('.pkl', '_nn.h5')
        try:
            self.neural_network = keras.models.load_model(nn_path)
        except:
            logger.info("No neural network model found")
        
        logger.info(f"Model loaded from {filepath}")


def main():
    """Train and evaluate fraud detection model"""
    
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'analytics',
        'user': 'analytics_user',
        'password': 'password',
    }
    
    model = FraudDetectionModel(db_config)
    results = model.train()
    
    print("\n=== Fraud Detection Model Results ===")
    print(f"Anomaly Detection:")
    print(f"  Mean anomaly score: {results['anomaly_detection']['mean_anomaly_score']:.4f}")
    print(f"  Anomalies detected: {results['anomaly_detection']['anomalies_detected']}")
    
    if results['has_nn']:
        print(f"\nNeural Network:")
        print(f"  AUC Score: {results['auc_score']:.4f}")
        print(f"  Precision: {results['precision']:.4f}")
        print(f"  Recall: {results['recall']:.4f}")
        print(f"  F1 Score: {results['f1_score']:.4f}")
    
    model.save('/tmp/fraud_detection_model.pkl')


if __name__ == '__main__':
    main()
