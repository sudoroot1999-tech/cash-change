"""Chat API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.schemas import ChatMessage, ChatResponse, ErrorResponse
from src.services.claude_service import ClaudeService
from src.database import get_db

logger = structlog.get_logger()
router = APIRouter(prefix="/ai/chat", tags=["AI Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    """
    Chat with AI assistant.
    
    Send a message and get AI-powered response with trading insights.
    """
    try:
        claude_service = ClaudeService()
        
        response = await claude_service.chat(
            message=message.message,
            conversation_id=message.conversation_id,
            user_id=message.user_id,
            context=message.context
        )
        
        return ChatResponse(**response)
    
    except Exception as e:
        logger.error("Chat failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get conversation history."""
    try:
        from src.database import MongoDB
        
        collection = MongoDB.get_collection('conversations')
        conversation = await collection.find_one({'conversation_id': conversation_id})
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            'conversation_id': conversation_id,
            'messages': conversation.get('messages', []),
            'created_at': conversation.get('created_at'),
            'updated_at': conversation.get('updated_at')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get conversation history", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
