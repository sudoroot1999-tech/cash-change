"""Model management endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import structlog

from src.schemas import ModelInfo, ModelDeployRequest
from src.models import ModelType
from src.services.model_manager import ModelManager
from src.database import get_db

logger = structlog.get_logger()
router = APIRouter(prefix="/ai/models", tags=["Model Management"])


@router.get("", response_model=List[ModelInfo])
async def list_models(
    model_type: Optional[ModelType] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """List all AI models."""
    try:
        model_manager = ModelManager()
        
        if active_only:
            models = await model_manager.get_active_models(db, model_type)
        else:
            from sqlalchemy import select
            from src.models import AIModel
            
            query = select(AIModel)
            if model_type:
                query = query.where(AIModel.model_type == model_type)
            
            result = await db.execute(query)
            models = result.scalars().all()
        
        return [
            ModelInfo(
                id=str(m.id),
                name=m.name,
                model_type=m.model_type,
                version=m.version,
                description=m.description,
                metrics=m.metrics,
                performance_score=m.performance_score,
                is_active=m.is_active,
                is_champion=m.is_champion,
                ab_test_group=m.ab_test_group,
                created_at=m.created_at,
                deployed_at=m.deployed_at
            )
            for m in models
        ]
    
    except Exception as e:
        logger.error("Failed to list models", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}", response_model=ModelInfo)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get model details."""
    try:
        from sqlalchemy import select
        from src.models import AIModel
        
        result = await db.execute(
            select(AIModel).where(AIModel.id == model_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return ModelInfo(
            id=str(model.id),
            name=model.name,
            model_type=model.model_type,
            version=model.version,
            description=model.description,
            metrics=model.metrics,
            performance_score=model.performance_score,
            is_active=model.is_active,
            is_champion=model.is_champion,
            ab_test_group=model.ab_test_group,
            created_at=model.created_at,
            deployed_at=model.deployed_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get model", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{model_id}/deploy", response_model=ModelInfo)
async def deploy_model(
    model_id: str,
    request: ModelDeployRequest,
    db: AsyncSession = Depends(get_db)
):
    """Deploy a model to production."""
    try:
        model_manager = ModelManager()
        
        model = await model_manager.deploy_model(
            db=db,
            model_id=model_id,
            replace_champion=request.replace_champion,
            ab_test_traffic=request.ab_test_traffic
        )
        
        return ModelInfo(
            id=str(model.id),
            name=model.name,
            model_type=model.model_type,
            version=model.version,
            description=model.description,
            metrics=model.metrics,
            performance_score=model.performance_score,
            is_active=model.is_active,
            is_champion=model.is_champion,
            ab_test_group=model.ab_test_group,
            created_at=model.created_at,
            deployed_at=model.deployed_at
        )
    
    except Exception as e:
        logger.error("Model deployment failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{model_id}")
async def retire_model(
    model_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retire a model from production."""
    try:
        model_manager = ModelManager()
        await model_manager.retire_model(db, model_id)
        
        return {"message": "Model retired successfully"}
    
    except Exception as e:
        logger.error("Model retirement failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}/metrics")
async def get_model_metrics(
    model_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get model performance metrics."""
    try:
        model_manager = ModelManager()
        metrics = await model_manager.get_model_metrics(db, model_id)
        
        return metrics
    
    except Exception as e:
        logger.error("Failed to get model metrics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id_a}/compare/{model_id_b}")
async def compare_models(
    model_id_a: str,
    model_id_b: str,
    db: AsyncSession = Depends(get_db)
):
    """Compare performance of two models."""
    try:
        model_manager = ModelManager()
        comparison = await model_manager.compare_models(db, model_id_a, model_id_b)
        
        return comparison
    
    except Exception as e:
        logger.error("Model comparison failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
