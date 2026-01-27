"""
User Segmentation Model
K-means clustering with RFM analysis for user persona identification
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import mlflow
import mlflow.sklearn
from datetime import datetime, timedelta
import logging
import joblib
import psycopg2
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UserSegmentationModel:
    """
    Segment users using K-means clustering and RFM analysis
    """
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.model = None
        self.scaler = StandardScaler()
        self.pca = None
        self.feature_names = []
        self.n_clusters = 5
        self.segment_profiles = {}
        
    def extract_user_features(self, days: int = 90) -> pd.DataFrame:
        """Extract user behavioral features for segmentation"""
        logger.info(f"Extracting user features (last {days} days)")
        
        conn = psycopg2.connect(**self.db_config)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        query = f"""
        WITH user_activity AS (
            SELECT 
                u.id as user_id,
                u.created_at,
                EXTRACT(DAY FROM NOW() - u.created_at) as account_age_days,
                
                -- Recency (days since last activity)
                COALESCE(EXTRACT(DAY FROM NOW() - MAX(ue.timestamp)), 999) as days_since_last_activity,
                
                -- Frequency (activity metrics)
                COUNT(DISTINCT ue.event_id) as total_events,
                COUNT(DISTINCT DATE(ue.timestamp)) as active_days,
                COUNT(DISTINCT ue.session_id) as session_count,
                
                -- Monetary (trading and balance)
                COALESCE(SUM(te.amount), 0) as total_trade_volume,
                COUNT(te.event_id) as trade_count,
                COUNT(DISTINCT te.trading_pair) as unique_pairs,
                
                -- Deposits and withdrawals
                COALESCE(SUM(CASE WHEN txe.transaction_type = 'deposit' THEN txe.amount ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN txe.transaction_type = 'withdrawal' THEN txe.amount ELSE 0 END), 0) as total_withdrawals,
                COUNT(CASE WHEN txe.transaction_type = 'deposit' THEN 1 END) as deposit_count,
                COUNT(CASE WHEN txe.transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
                
                -- Current balance
                COALESCE(w.total_balance, 0) as current_balance,
                COALESCE(w.asset_count, 0) as asset_diversity,
                
                -- Engagement features
                COUNT(CASE WHEN ue.event_category = 'interaction' THEN 1 END) as interaction_count,
                COUNT(DISTINCT ue.device_type) as device_count,
                
                -- User profile
                CASE WHEN u.kyc_status = 'verified' THEN 1 ELSE 0 END as is_kyc_verified,
                u.kyc_level
                
            FROM users u
            LEFT JOIN user_events ue ON u.id = ue.user_id 
                AND ue.timestamp >= '{start_date}'::timestamp
            LEFT JOIN trading_events te ON u.id = te.user_id 
                AND te.timestamp >= '{start_date}'::timestamp
                AND te.status = 'completed'
            LEFT JOIN transaction_events txe ON u.id = txe.user_id 
                AND txe.timestamp >= '{start_date}'::timestamp
                AND txe.status = 'completed'
            LEFT JOIN (
                SELECT user_id, 
                       SUM(balance) as total_balance,
                       COUNT(DISTINCT currency) as asset_count
                FROM wallets
                GROUP BY user_id
            ) w ON u.id = w.user_id
            WHERE u.created_at < '{end_date}'::timestamp
            GROUP BY u.id, u.created_at, u.kyc_status, u.kyc_level, w.total_balance, w.asset_count
        )
        SELECT * FROM user_activity
        WHERE total_events > 0  -- Only users with some activity
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        logger.info(f"Extracted {len(df)} active users")
        return df
    
    def calculate_rfm_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate RFM (Recency, Frequency, Monetary) scores"""
        logger.info("Calculating RFM scores")
        
        # Recency score (inverse - lower days = higher score)
        df['recency_score'] = pd.qcut(
            df['days_since_last_activity'], 
            q=5, 
            labels=[5, 4, 3, 2, 1],
            duplicates='drop'
        ).astype(int)
        
        # Frequency score
        df['frequency_score'] = pd.qcut(
            df['active_days'], 
            q=5, 
            labels=[1, 2, 3, 4, 5],
            duplicates='drop'
        ).astype(int)
        
        # Monetary score
        df['monetary_score'] = pd.qcut(
            df['total_trade_volume'], 
            q=5, 
            labels=[1, 2, 3, 4, 5],
            duplicates='drop'
        ).astype(int)
        
        # Combined RFM score
        df['rfm_score'] = (
            df['recency_score'] * 100 + 
            df['frequency_score'] * 10 + 
            df['monetary_score']
        )
        
        return df
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for segmentation"""
        logger.info("Engineering segmentation features")
        
        # Behavioral ratios
        df['events_per_day'] = df['total_events'] / df['active_days'].clip(lower=1)
        df['trades_per_day'] = df['trade_count'] / df['active_days'].clip(lower=1)
        df['avg_trade_size'] = df['total_trade_volume'] / df['trade_count'].clip(lower=1)
        
        # Financial ratios
        df['deposit_withdrawal_ratio'] = df['total_deposits'] / (df['total_withdrawals'] + 1)
        df['net_deposits'] = df['total_deposits'] - df['total_withdrawals']
        df['balance_to_volume_ratio'] = df['current_balance'] / (df['total_trade_volume'] + 1)
        
        # Engagement metrics
        df['session_length'] = df['total_events'] / df['session_count'].clip(lower=1)
        df['interaction_ratio'] = df['interaction_count'] / df['total_events'].clip(lower=1)
        
        # User maturity
        df['is_new_user'] = (df['account_age_days'] < 30).astype(int)
        df['is_active_trader'] = (df['trade_count'] > 10).astype(int)
        df['is_diversified'] = (df['unique_pairs'] > 3).astype(int)
        
        # Activity level
        df['activity_ratio'] = df['active_days'] / df['account_age_days'].clip(lower=1)
        
        # Fill missing values
        df = df.fillna(0)
        
        return df
    
    def determine_optimal_clusters(self, X: np.ndarray, max_clusters: int = 10) -> int:
        """Determine optimal number of clusters using elbow method and silhouette score"""
        logger.info("Determining optimal number of clusters")
        
        inertias = []
        silhouette_scores = []
        K_range = range(2, max_clusters + 1)
        
        for k in K_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(X)
            inertias.append(kmeans.inertia_)
            silhouette_scores.append(silhouette_score(X, kmeans.labels_))
        
        # Find elbow point (simplified)
        # Use silhouette score to select best k
        optimal_k = K_range[np.argmax(silhouette_scores)]
        
        logger.info(f"Optimal number of clusters: {optimal_k}")
        logger.info(f"Silhouette score: {max(silhouette_scores):.3f}")
        
        # Plot elbow curve
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        
        ax1.plot(K_range, inertias, 'bo-')
        ax1.set_xlabel('Number of Clusters')
        ax1.set_ylabel('Inertia')
        ax1.set_title('Elbow Method')
        ax1.axvline(x=optimal_k, color='r', linestyle='--', label=f'Optimal k={optimal_k}')
        ax1.legend()
        
        ax2.plot(K_range, silhouette_scores, 'go-')
        ax2.set_xlabel('Number of Clusters')
        ax2.set_ylabel('Silhouette Score')
        ax2.set_title('Silhouette Analysis')
        ax2.axvline(x=optimal_k, color='r', linestyle='--', label=f'Optimal k={optimal_k}')
        ax2.legend()
        
        plt.tight_layout()
        plt.savefig('/tmp/cluster_optimization.png')
        plt.close()
        
        return optimal_k
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """Prepare features for clustering"""
        
        # Select numerical features for clustering
        exclude_cols = ['user_id', 'created_at']
        feature_cols = [col for col in df.columns 
                       if col not in exclude_cols and df[col].dtype in ['int64', 'float64']]
        
        X = df[feature_cols].values
        self.feature_names = feature_cols
        
        return X, feature_cols
    
    def train(self, n_clusters: Optional[int] = None) -> Dict:
        """Train K-means clustering model"""
        logger.info("Starting user segmentation")
        
        # Extract and engineer features
        df = self.extract_user_features()
        df = self.calculate_rfm_scores(df)
        df = self.engineer_features(df)
        
        X, feature_names = self.prepare_data(df)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Apply PCA for dimensionality reduction (for visualization)
        self.pca = PCA(n_components=2)
        X_pca = self.pca.fit_transform(X_scaled)
        
        # Start MLflow run
        with mlflow.start_run(run_name=f"user_segmentation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            
            # Determine optimal clusters if not specified
            if n_clusters is None:
                n_clusters = self.determine_optimal_clusters(X_scaled)
                mlflow.log_artifact('/tmp/cluster_optimization.png')
            
            self.n_clusters = n_clusters
            
            # Train K-means
            self.model = KMeans(
                n_clusters=n_clusters,
                random_state=42,
                n_init=20,
                max_iter=500
            )
            
            cluster_labels = self.model.fit_predict(X_scaled)
            df['segment'] = cluster_labels
            
            # Calculate metrics
            silhouette_avg = silhouette_score(X_scaled, cluster_labels)
            davies_bouldin = davies_bouldin_score(X_scaled, cluster_labels)
            
            # Analyze segment profiles
            self.segment_profiles = self.analyze_segments(df)
            
            # Visualize clusters
            self.visualize_clusters(X_pca, cluster_labels, df)
            
            # Log parameters and metrics
            mlflow.log_param("n_clusters", n_clusters)
            mlflow.log_param("n_features", len(feature_names))
            mlflow.log_metric("silhouette_score", silhouette_avg)
            mlflow.log_metric("davies_bouldin_score", davies_bouldin)
            
            # Log models
            mlflow.sklearn.log_model(self.model, "kmeans_model")
            mlflow.sklearn.log_model(self.scaler, "scaler")
            mlflow.sklearn.log_model(self.pca, "pca")
            
            # Log artifacts
            mlflow.log_artifact('/tmp/cluster_visualization.png')
            mlflow.log_artifact('/tmp/segment_profiles.png')
            
            # Save segment profiles
            profiles_df = pd.DataFrame(self.segment_profiles).T
            profiles_df.to_csv('/tmp/segment_profiles.csv')
            mlflow.log_artifact('/tmp/segment_profiles.csv')
            
            logger.info(f"Segmentation complete with {n_clusters} segments")
            logger.info(f"Silhouette score: {silhouette_avg:.3f}")
            
            results = {
                'n_clusters': n_clusters,
                'silhouette_score': silhouette_avg,
                'davies_bouldin_score': davies_bouldin,
                'segment_profiles': self.segment_profiles,
            }
            
            return results
    
    def analyze_segments(self, df: pd.DataFrame) -> Dict:
        """Analyze characteristics of each segment"""
        logger.info("Analyzing segment profiles")
        
        segment_profiles = {}
        
        for segment_id in range(self.n_clusters):
            segment_data = df[df['segment'] == segment_id]
            
            profile = {
                'segment_id': int(segment_id),
                'size': len(segment_data),
                'percentage': len(segment_data) / len(df) * 100,
                
                # RFM scores
                'avg_recency_score': segment_data['recency_score'].mean(),
                'avg_frequency_score': segment_data['frequency_score'].mean(),
                'avg_monetary_score': segment_data['monetary_score'].mean(),
                'avg_rfm_score': segment_data['rfm_score'].mean(),
                
                # Key metrics
                'avg_trade_volume': segment_data['total_trade_volume'].mean(),
                'avg_balance': segment_data['current_balance'].mean(),
                'avg_active_days': segment_data['active_days'].mean(),
                'avg_trades_per_day': segment_data['trades_per_day'].mean(),
                'kyc_rate': segment_data['is_kyc_verified'].mean(),
                
                # Behavioral characteristics
                'avg_account_age': segment_data['account_age_days'].mean(),
                'new_user_rate': segment_data['is_new_user'].mean(),
                'active_trader_rate': segment_data['is_active_trader'].mean(),
            }
            
            # Assign persona based on characteristics
            profile['persona'] = self.assign_persona(profile)
            
            segment_profiles[segment_id] = profile
        
        return segment_profiles
    
    def assign_persona(self, profile: Dict) -> str:
        """Assign user persona based on segment characteristics"""
        
        # High value users
        if profile['avg_monetary_score'] >= 4 and profile['avg_frequency_score'] >= 3:
            if profile['avg_recency_score'] >= 4:
                return "VIP Active Traders"
            else:
                return "VIP At Risk"
        
        # Active but lower volume
        elif profile['avg_frequency_score'] >= 4 and profile['avg_monetary_score'] < 3:
            return "Frequent Small Traders"
        
        # High potential
        elif profile['new_user_rate'] > 0.5 and profile['avg_monetary_score'] >= 3:
            return "High Potential Newcomers"
        
        # Dormant
        elif profile['avg_recency_score'] <= 2:
            if profile['avg_monetary_score'] >= 3:
                return "Dormant High Value"
            else:
                return "Dormant Low Value"
        
        # Casual users
        elif profile['avg_frequency_score'] <= 2 and profile['avg_monetary_score'] <= 2:
            return "Casual Users"
        
        # Medium engaged
        else:
            return "Medium Engaged"
    
    def visualize_clusters(self, X_pca: np.ndarray, labels: np.ndarray, df: pd.DataFrame):
        """Visualize clusters using PCA"""
        logger.info("Creating cluster visualizations")
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # PCA scatter plot
        ax1 = axes[0, 0]
        scatter = ax1.scatter(X_pca[:, 0], X_pca[:, 1], c=labels, cmap='viridis', alpha=0.6)
        ax1.set_xlabel('First Principal Component')
        ax1.set_ylabel('Second Principal Component')
        ax1.set_title('User Segments (PCA)')
        plt.colorbar(scatter, ax=ax1)
        
        # Segment size distribution
        ax2 = axes[0, 1]
        segment_counts = df['segment'].value_counts().sort_index()
        ax2.bar(segment_counts.index, segment_counts.values, color='skyblue')
        ax2.set_xlabel('Segment')
        ax2.set_ylabel('Number of Users')
        ax2.set_title('Segment Distribution')
        
        # RFM scores by segment
        ax3 = axes[1, 0]
        rfm_by_segment = df.groupby('segment')[['recency_score', 'frequency_score', 'monetary_score']].mean()
        rfm_by_segment.plot(kind='bar', ax=ax3)
        ax3.set_xlabel('Segment')
        ax3.set_ylabel('Average Score')
        ax3.set_title('RFM Scores by Segment')
        ax3.legend(['Recency', 'Frequency', 'Monetary'])
        ax3.set_xticklabels(ax3.get_xticklabels(), rotation=0)
        
        # Trade volume by segment
        ax4 = axes[1, 1]
        volume_by_segment = df.groupby('segment')['total_trade_volume'].mean()
        ax4.bar(volume_by_segment.index, volume_by_segment.values, color='coral')
        ax4.set_xlabel('Segment')
        ax4.set_ylabel('Average Trade Volume')
        ax4.set_title('Average Trade Volume by Segment')
        
        plt.tight_layout()
        plt.savefig('/tmp/cluster_visualization.png', dpi=300)
        plt.close()
        
        # Detailed segment profiles
        fig, ax = plt.subplots(figsize=(12, 6))
        
        personas = [self.segment_profiles[i]['persona'] for i in range(self.n_clusters)]
        sizes = [self.segment_profiles[i]['size'] for i in range(self.n_clusters)]
        
        ax.barh(personas, sizes, color=plt.cm.viridis(np.linspace(0, 1, self.n_clusters)))
        ax.set_xlabel('Number of Users')
        ax.set_title('User Personas Distribution')
        
        plt.tight_layout()
        plt.savefig('/tmp/segment_profiles.png', dpi=300)
        plt.close()
    
    def predict(self, user_data: pd.DataFrame) -> pd.DataFrame:
        """Assign segment to new users"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Engineer features
        user_data = self.calculate_rfm_scores(user_data)
        user_data = self.engineer_features(user_data)
        
        # Prepare features
        X = user_data[self.feature_names].values
        X_scaled = self.scaler.transform(X)
        
        # Predict segment
        segments = self.model.predict(X_scaled)
        
        # Add segment info
        user_data['segment'] = segments
        user_data['persona'] = user_data['segment'].map(
            lambda s: self.segment_profiles[s]['persona']
        )
        
        return user_data[['user_id', 'segment', 'persona', 'rfm_score']]
    
    def save(self, filepath: str):
        """Save model to disk"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'pca': self.pca,
            'feature_names': self.feature_names,
            'n_clusters': self.n_clusters,
            'segment_profiles': self.segment_profiles,
        }, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.pca = data['pca']
        self.feature_names = data['feature_names']
        self.n_clusters = data['n_clusters']
        self.segment_profiles = data['segment_profiles']
        logger.info(f"Model loaded from {filepath}")


def main():
    """Train and analyze user segmentation"""
    
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'analytics',
        'user': 'analytics_user',
        'password': 'password',
    }
    
    model = UserSegmentationModel(db_config)
    results = model.train()
    
    print("\n=== User Segmentation Results ===")
    print(f"Number of segments: {results['n_clusters']}")
    print(f"Silhouette score: {results['silhouette_score']:.3f}")
    
    print("\n=== Segment Profiles ===")
    for segment_id, profile in results['segment_profiles'].items():
        print(f"\nSegment {segment_id}: {profile['persona']}")
        print(f"  Size: {profile['size']} users ({profile['percentage']:.1f}%)")
        print(f"  Avg Trade Volume: ${profile['avg_trade_volume']:.2f}")
        print(f"  Avg Balance: ${profile['avg_balance']:.2f}")
        print(f"  RFM Score: {profile['avg_rfm_score']:.0f}")
        print(f"  Active Trader Rate: {profile['active_trader_rate']:.1%}")
    
    model.save('/tmp/user_segmentation_model.pkl')


if __name__ == '__main__':
    main()
