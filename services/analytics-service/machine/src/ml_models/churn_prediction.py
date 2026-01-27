"""
Churn Prediction Model
XGBoost classifier to predict user churn risk
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import xgboost as xgb
import mlflow
import mlflow.xgboost
from datetime import datetime, timedelta
import logging
import joblib
import psycopg2
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChurnPredictionModel:
    """
    Predicts user churn probability based on behavioral features
    """
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.threshold = 0.5
        
    def extract_features(self, lookback_days: int = 30, churn_days: int = 14) -> pd.DataFrame:
        """
        Extract features for churn prediction
        
        Args:
            lookback_days: Days to look back for feature calculation
            churn_days: Days of inactivity to define churn
        """
        logger.info(f"Extracting features (lookback={lookback_days}, churn={churn_days})")
        
        conn = psycopg2.connect(**self.db_config)
        
        # Define churn cutoff dates
        feature_end_date = datetime.now() - timedelta(days=churn_days)
        feature_start_date = feature_end_date - timedelta(days=lookback_days)
        churn_check_date = datetime.now()
        
        query = f"""
        WITH user_features AS (
            SELECT 
                u.id as user_id,
                u.created_at as registration_date,
                EXTRACT(DAY FROM '{feature_end_date}'::timestamp - u.created_at) as account_age_days,
                
                -- Activity metrics
                COUNT(DISTINCT ue.event_id) as total_events,
                COUNT(DISTINCT DATE(ue.timestamp)) as active_days,
                COUNT(DISTINCT ue.session_id) as session_count,
                AVG(EXTRACT(HOUR FROM ue.timestamp)) as avg_activity_hour,
                
                -- Trading metrics
                COUNT(te.event_id) as trade_count,
                COALESCE(SUM(te.amount), 0) as total_trade_volume,
                COALESCE(AVG(te.amount), 0) as avg_trade_size,
                COUNT(DISTINCT te.trading_pair) as unique_pairs_traded,
                
                -- Transaction metrics
                COUNT(CASE WHEN txe.transaction_type = 'deposit' THEN 1 END) as deposit_count,
                COUNT(CASE WHEN txe.transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
                COALESCE(SUM(CASE WHEN txe.transaction_type = 'deposit' THEN txe.amount ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN txe.transaction_type = 'withdrawal' THEN txe.amount ELSE 0 END), 0) as total_withdrawals,
                
                -- Engagement metrics
                COUNT(CASE WHEN ue.event_category = 'interaction' THEN 1 END) as interaction_events,
                COUNT(DISTINCT ue.device_type) as device_diversity,
                
                -- Recency metrics
                EXTRACT(DAY FROM '{feature_end_date}'::timestamp - MAX(ue.timestamp)) as days_since_last_activity,
                EXTRACT(DAY FROM '{feature_end_date}'::timestamp - MAX(te.timestamp)) as days_since_last_trade,
                
                -- Financial metrics
                w.total_balance,
                w.asset_count,
                
                -- User profile
                CASE WHEN u.kyc_status = 'verified' THEN 1 ELSE 0 END as is_kyc_verified,
                CASE WHEN u.two_factor_enabled THEN 1 ELSE 0 END as has_2fa
                
            FROM users u
            LEFT JOIN user_events ue ON u.id = ue.user_id 
                AND ue.timestamp BETWEEN '{feature_start_date}'::timestamp AND '{feature_end_date}'::timestamp
            LEFT JOIN trading_events te ON u.id = te.user_id 
                AND te.timestamp BETWEEN '{feature_start_date}'::timestamp AND '{feature_end_date}'::timestamp
            LEFT JOIN transaction_events txe ON u.id = txe.user_id 
                AND txe.timestamp BETWEEN '{feature_start_date}'::timestamp AND '{feature_end_date}'::timestamp
            LEFT JOIN (
                SELECT user_id, 
                       SUM(balance) as total_balance,
                       COUNT(DISTINCT currency) as asset_count
                FROM wallets
                GROUP BY user_id
            ) w ON u.id = w.user_id
            WHERE u.created_at < '{feature_end_date}'::timestamp
            GROUP BY u.id, u.created_at, u.kyc_status, u.two_factor_enabled, w.total_balance, w.asset_count
        ),
        churn_labels AS (
            SELECT 
                user_id,
                CASE 
                    WHEN MAX(timestamp) < '{feature_end_date}'::timestamp THEN 1
                    ELSE 0
                END as churned
            FROM user_events
            WHERE timestamp <= '{churn_check_date}'::timestamp
            GROUP BY user_id
        )
        SELECT 
            uf.*,
            COALESCE(cl.churned, 1) as churned
        FROM user_features uf
        LEFT JOIN churn_labels cl ON uf.user_id = cl.user_id
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        logger.info(f"Extracted {len(df)} user records")
        logger.info(f"Churn rate: {df['churned'].mean():.2%}")
        
        return df
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create derived features"""
        logger.info("Engineering features")
        
        # Frequency features
        df['events_per_day'] = df['total_events'] / df['active_days'].clip(lower=1)
        df['trades_per_day'] = df['trade_count'] / df['active_days'].clip(lower=1)
        df['sessions_per_day'] = df['session_count'] / df['active_days'].clip(lower=1)
        
        # Monetary features
        df['deposit_withdrawal_ratio'] = (df['total_deposits'] / 
                                          (df['total_withdrawals'] + 1))
        df['net_deposits'] = df['total_deposits'] - df['total_withdrawals']
        df['avg_deposit_size'] = df['total_deposits'] / (df['deposit_count'] + 1)
        
        # Engagement features
        df['engagement_ratio'] = df['interaction_events'] / (df['total_events'] + 1)
        df['trading_ratio'] = df['trade_count'] / (df['total_events'] + 1)
        
        # Recency features
        df['activity_recency_score'] = 1 / (df['days_since_last_activity'] + 1)
        df['trade_recency_score'] = 1 / (df['days_since_last_trade'].fillna(999) + 1)
        
        # User maturity
        df['is_new_user'] = (df['account_age_days'] < 7).astype(int)
        df['is_active_trader'] = (df['trade_count'] > 5).astype(int)
        df['is_whale'] = (df['total_balance'] > df['total_balance'].quantile(0.9)).astype(int)
        
        # Fill missing values
        df = df.fillna(0)
        
        return df
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Prepare features and labels for training"""
        
        # Define feature columns (exclude ID and target)
        exclude_cols = ['user_id', 'registration_date', 'churned']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols].values
        y = df['churned'].values
        
        self.feature_names = feature_cols
        
        return X, y, feature_cols
    
    def train(self, test_size: float = 0.2, random_state: int = 42) -> Dict:
        """Train the churn prediction model"""
        logger.info("Starting model training")
        
        # Extract and engineer features
        df = self.extract_features()
        df = self.engineer_features(df)
        
        X, y, feature_names = self.prepare_data(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Start MLflow run
        with mlflow.start_run(run_name=f"churn_prediction_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            
            # Train XGBoost model
            params = {
                'objective': 'binary:logistic',
                'max_depth': 6,
                'learning_rate': 0.1,
                'n_estimators': 200,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'gamma': 0.1,
                'reg_alpha': 0.1,
                'reg_lambda': 1.0,
                'scale_pos_weight': (len(y_train) - y_train.sum()) / y_train.sum(),  # Handle imbalance
                'random_state': random_state,
                'eval_metric': 'auc',
            }
            
            self.model = xgb.XGBClassifier(**params)
            
            # Train with early stopping
            self.model.fit(
                X_train_scaled, y_train,
                eval_set=[(X_test_scaled, y_test)],
                early_stopping_rounds=20,
                verbose=False
            )
            
            # Predictions
            y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
            y_pred = (y_pred_proba >= self.threshold).astype(int)
            
            # Evaluate
            auc_score = roc_auc_score(y_test, y_pred_proba)
            conf_matrix = confusion_matrix(y_test, y_pred)
            class_report = classification_report(y_test, y_pred, output_dict=True)
            
            # Feature importance
            feature_importance = pd.DataFrame({
                'feature': feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            # Log metrics
            mlflow.log_params(params)
            mlflow.log_metric("auc_score", auc_score)
            mlflow.log_metric("precision", class_report['1']['precision'])
            mlflow.log_metric("recall", class_report['1']['recall'])
            mlflow.log_metric("f1_score", class_report['1']['f1-score'])
            
            # Log model
            mlflow.xgboost.log_model(self.model, "model")
            mlflow.sklearn.log_model(self.scaler, "scaler")
            
            # Log feature importance
            feature_importance.to_csv('/tmp/feature_importance.csv', index=False)
            mlflow.log_artifact('/tmp/feature_importance.csv')
            
            logger.info(f"Model trained successfully. AUC: {auc_score:.4f}")
            logger.info(f"Precision: {class_report['1']['precision']:.4f}")
            logger.info(f"Recall: {class_report['1']['recall']:.4f}")
            
            results = {
                'auc_score': auc_score,
                'precision': class_report['1']['precision'],
                'recall': class_report['1']['recall'],
                'f1_score': class_report['1']['f1-score'],
                'confusion_matrix': conf_matrix.tolist(),
                'feature_importance': feature_importance.head(10).to_dict('records'),
            }
            
            return results
    
    def predict(self, user_data: pd.DataFrame) -> pd.DataFrame:
        """Predict churn probability for users"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Engineer features
        user_data_processed = self.engineer_features(user_data)
        
        # Prepare features
        X = user_data_processed[self.feature_names].values
        X_scaled = self.scaler.transform(X)
        
        # Predict
        churn_proba = self.model.predict_proba(X_scaled)[:, 1]
        churn_pred = (churn_proba >= self.threshold).astype(int)
        
        # Add predictions to dataframe
        user_data['churn_probability'] = churn_proba
        user_data['churn_prediction'] = churn_pred
        user_data['risk_level'] = pd.cut(
            churn_proba,
            bins=[0, 0.3, 0.6, 1.0],
            labels=['Low', 'Medium', 'High']
        )
        
        return user_data[['user_id', 'churn_probability', 'churn_prediction', 'risk_level']]
    
    def save(self, filepath: str):
        """Save model to disk"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'threshold': self.threshold,
        }, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.threshold = data['threshold']
        logger.info(f"Model loaded from {filepath}")


def main():
    """Train and evaluate churn prediction model"""
    
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'analytics',
        'user': 'analytics_user',
        'password': 'password',
    }
    
    # Initialize and train model
    model = ChurnPredictionModel(db_config)
    results = model.train()
    
    print("\n=== Churn Prediction Model Results ===")
    print(f"AUC Score: {results['auc_score']:.4f}")
    print(f"Precision: {results['precision']:.4f}")
    print(f"Recall: {results['recall']:.4f}")
    print(f"F1 Score: {results['f1_score']:.4f}")
    
    print("\nTop 10 Important Features:")
    for feat in results['feature_importance']:
        print(f"  {feat['feature']}: {feat['importance']:.4f}")
    
    # Save model
    model.save('/tmp/churn_prediction_model.pkl')


if __name__ == '__main__':
    main()
