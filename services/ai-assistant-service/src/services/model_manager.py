"""AI model versioning, A/B testing, and management."""
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import mlflow
import random

from src.config import settings
from src.models import AIModel, ModelPredictionLog, ModelType
from src.database import get_db

logger = structlog.get_logger()


class ModelManager:
    """Manage AI models, versioning, and A/B testing."""
    
    def __init__(self):
        """Initialize model manager."""
        self.enable_ab_testing = settings.enable_ab_testing
        self.ab_test_split = settings.ab_test_split
        
        # Configure MLflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment_name)
    
    async def register_model(self, db: AsyncSession, name: str, 
                           model_type: ModelType, version: str,
                           description: Optional[str] = None,
                           hyperparameters: Optional[Dict] = None,
                           metrics: Optional[Dict] = None,
                           file_path: Optional[str] = None) -> AIModel:
        """Register a new model version."""
        try:
            # Create model record
            model = AIModel(
                name=name,
                model_type=model_type,
                version=version,
                description=description,
                hyperparameters=hyperparameters,
                metrics=metrics,
                file_path=file_path,
                is_active=False,  # Not active by default
                is_champion=False,
                performance_score=metrics.get('r2', 0.0) if metrics else 0.0
            )
            
            db.add(model)
            await db.commit()
            await db.refresh(model)
            
            logger.info("Model registered", 
                       name=name, 
                       version=version,
                       model_id=str(model.id))
            
            return model
        
        except Exception as e:
            logger.error("Model registration failed", error=str(e))
            raise
    
    async def deploy_model(self, db: AsyncSession, model_id: str,
                          replace_champion: bool = False,
                          ab_test_traffic: Optional[float] = None) -> AIModel:
        """
        Deploy a model to production.
        
        Args:
            db: Database session
            model_id: Model ID to deploy
            replace_champion: Whether to replace the current champion
            ab_test_traffic: Traffic percentage for A/B testing (0.0-1.0)
        """
        try:
            # Get model
            result = await db.execute(
                select(AIModel).where(AIModel.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            # Activate model
            model.is_active = True
            model.deployed_at = datetime.utcnow()
            
            if replace_champion:
                # Deactivate current champion
                await db.execute(
                    select(AIModel).where(
                        and_(
                            AIModel.model_type == model.model_type,
                            AIModel.is_champion == True
                        )
                    )
                )
                current_champion = result.scalar_one_or_none()
                if current_champion:
                    current_champion.is_champion = False
                    current_champion.ab_test_group = None
                
                model.is_champion = True
                model.ab_test_group = 'A'
                model.ab_test_traffic = 1.0
            
            elif ab_test_traffic is not None:
                # Setup A/B test
                model.ab_test_group = 'B'
                model.ab_test_traffic = ab_test_traffic
                
                # Update champion traffic
                result = await db.execute(
                    select(AIModel).where(
                        and_(
                            AIModel.model_type == model.model_type,
                            AIModel.is_champion == True
                        )
                    )
                )
                champion = result.scalar_one_or_none()
                if champion:
                    champion.ab_test_traffic = 1.0 - ab_test_traffic
            
            await db.commit()
            await db.refresh(model)
            
            logger.info("Model deployed", 
                       model_id=str(model.id),
                       is_champion=model.is_champion,
                       ab_test_group=model.ab_test_group)
            
            return model
        
        except Exception as e:
            logger.error("Model deployment failed", error=str(e))
            raise
    
    async def select_model(self, db: AsyncSession, 
                          model_type: ModelType) -> Optional[AIModel]:
        """
        Select model for inference using A/B testing logic.
        
        Args:
            db: Database session
            model_type: Type of model to select
        
        Returns:
            Selected model
        """
        try:
            # Get active models of this type
            result = await db.execute(
                select(AIModel).where(
                    and_(
                        AIModel.model_type == model_type,
                        AIModel.is_active == True
                    )
                )
            )
            models = result.scalars().all()
            
            if not models:
                logger.warning("No active models found", model_type=model_type)
                return None
            
            # If only one model, return it
            if len(models) == 1:
                return models[0]
            
            # A/B testing logic
            if self.enable_ab_testing:
                # Get models with A/B test configuration
                ab_models = [m for m in models if m.ab_test_traffic is not None]
                
                if ab_models:
                    # Select based on traffic allocation
                    rand = random.random()
                    cumulative = 0.0
                    
                    for model in ab_models:
                        cumulative += model.ab_test_traffic
                        if rand < cumulative:
                            return model
            
            # Default: return champion or most recent
            champion = next((m for m in models if m.is_champion), None)
            if champion:
                return champion
            
            # Return most recently deployed
            return max(models, key=lambda m: m.deployed_at or datetime.min)
        
        except Exception as e:
            logger.error("Model selection failed", error=str(e))
            return None
    
    async def log_prediction(self, db: AsyncSession, model_id: str,
                           model_version: str, pair: str,
                           input_features: Dict, prediction: Dict,
                           confidence: float, latency_ms: float):
        """Log model prediction for monitoring."""
        try:
            log = ModelPredictionLog(
                model_id=model_id,
                model_version=model_version,
                pair=pair,
                input_features=input_features,
                prediction=prediction,
                confidence=confidence,
                latency_ms=latency_ms
            )
            
            db.add(log)
            await db.commit()
        
        except Exception as e:
            logger.error("Failed to log prediction", error=str(e))
    
    async def get_model_metrics(self, db: AsyncSession, 
                               model_id: str) -> Dict:
        """Get performance metrics for a model."""
        try:
            # Get model
            result = await db.execute(
                select(AIModel).where(AIModel.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            # Get prediction logs
            result = await db.execute(
                select(ModelPredictionLog)
                .where(ModelPredictionLog.model_id == model_id)
                .order_by(desc(ModelPredictionLog.created_at))
                .limit(1000)
            )
            logs = result.scalars().all()
            
            if not logs:
                return {'predictions': 0}
            
            # Calculate metrics
            total_predictions = len(logs)
            avg_confidence = sum(log.confidence for log in logs) / total_predictions
            avg_latency = sum(log.latency_ms for log in logs) / total_predictions
            
            return {
                'model_id': str(model.id),
                'model_version': model.version,
                'total_predictions': total_predictions,
                'avg_confidence': round(avg_confidence, 3),
                'avg_latency_ms': round(avg_latency, 2),
                'is_champion': model.is_champion,
                'ab_test_group': model.ab_test_group,
                'ab_test_traffic': model.ab_test_traffic,
                'deployed_at': model.deployed_at.isoformat() if model.deployed_at else None
            }
        
        except Exception as e:
            logger.error("Failed to get model metrics", error=str(e))
            raise
    
    async def compare_models(self, db: AsyncSession, 
                           model_id_a: str, model_id_b: str) -> Dict:
        """Compare performance of two models."""
        try:
            metrics_a = await self.get_model_metrics(db, model_id_a)
            metrics_b = await self.get_model_metrics(db, model_id_b)
            
            comparison = {
                'model_a': metrics_a,
                'model_b': metrics_b,
                'winner': None
            }
            
            # Simple comparison based on confidence
            if metrics_a['avg_confidence'] > metrics_b['avg_confidence']:
                comparison['winner'] = 'model_a'
            elif metrics_b['avg_confidence'] > metrics_a['avg_confidence']:
                comparison['winner'] = 'model_b'
            else:
                comparison['winner'] = 'tie'
            
            return comparison
        
        except Exception as e:
            logger.error("Model comparison failed", error=str(e))
            raise
    
    async def retire_model(self, db: AsyncSession, model_id: str):
        """Retire a model from production."""
        try:
            result = await db.execute(
                select(AIModel).where(AIModel.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            model.is_active = False
            model.is_champion = False
            model.retired_at = datetime.utcnow()
            
            await db.commit()
            
            logger.info("Model retired", model_id=str(model.id))
        
        except Exception as e:
            logger.error("Model retirement failed", error=str(e))
            raise
    
    async def get_active_models(self, db: AsyncSession, 
                               model_type: Optional[ModelType] = None) -> List[AIModel]:
        """Get all active models."""
        try:
            query = select(AIModel).where(AIModel.is_active == True)
            
            if model_type:
                query = query.where(AIModel.model_type == model_type)
            
            query = query.order_by(desc(AIModel.deployed_at))
            
            result = await db.execute(query)
            return result.scalars().all()
        
        except Exception as e:
            logger.error("Failed to get active models", error=str(e))
            raise
    
    def log_to_mlflow(self, model_name: str, params: Dict, 
                     metrics: Dict, artifacts: Optional[Dict] = None) -> str:
        """Log model training to MLflow."""
        try:
            with mlflow.start_run(run_name=model_name):
                # Log parameters
                mlflow.log_params(params)
                
                # Log metrics
                mlflow.log_metrics(metrics)
                
                # Log artifacts
                if artifacts:
                    for name, path in artifacts.items():
                        mlflow.log_artifact(path, name)
                
                run_id = mlflow.active_run().info.run_id
                
                logger.info("Logged to MLflow", 
                           model_name=model_name,
                           run_id=run_id)
                
                return run_id
        
        except Exception as e:
            logger.error("MLflow logging failed", error=str(e))
            raise
