"""Claude AI integration for conversational AI."""
from typing import List, Dict, Optional
from anthropic import Anthropic, AsyncAnthropic
import structlog
from datetime import datetime

from src.config import settings
from src.database import MongoDB

logger = structlog.get_logger()


class ClaudeService:
    """Claude AI service for natural language interactions."""
    
    def __init__(self):
        """Initialize Claude service."""
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.max_tokens
        
        # System prompt for trading assistant
        self.system_prompt = """You are an expert AI trading assistant with deep knowledge of:
- Cryptocurrency and traditional markets
- Technical analysis (RSI, MACD, Bollinger Bands, chart patterns)
- Fundamental analysis and market sentiment
- Risk management and portfolio optimization
- Trading strategies and backtesting

Your role is to:
1. Provide clear, actionable insights based on data
2. Explain complex concepts in simple terms
3. Help users make informed trading decisions
4. Alert users to risks and provide risk-adjusted recommendations
5. Support both novice and experienced traders

Always:
- Be objective and data-driven
- Acknowledge uncertainty when present
- Provide confidence levels for predictions
- Recommend proper risk management
- Disclose that you're an AI assistant, not a licensed financial advisor

When analyzing markets:
- Consider multiple timeframes
- Look at both technical and fundamental factors
- Account for current market conditions
- Provide specific entry/exit points when appropriate
- Include stop-loss and take-profit levels
"""
    
    def _format_context(self, context: Dict) -> str:
        """Format context data for Claude."""
        context_str = "\n\nCurrent Market Context:\n"
        
        if 'pair' in context:
            context_str += f"Trading Pair: {context['pair']}\n"
        
        if 'current_price' in context:
            context_str += f"Current Price: ${context['current_price']:,.2f}\n"
        
        if 'signals' in context:
            context_str += "\nRecent Signals:\n"
            for signal in context['signals'][:3]:
                context_str += f"- {signal['type'].upper()} signal (confidence: {signal['confidence']:.0%})\n"
        
        if 'indicators' in context:
            context_str += "\nTechnical Indicators:\n"
            ind = context['indicators']
            if 'rsi' in ind:
                context_str += f"- RSI: {ind['rsi']:.1f}\n"
            if 'macd' in ind:
                context_str += f"- MACD: {ind['macd']:.2f}\n"
        
        if 'patterns' in context:
            context_str += "\nDetected Patterns:\n"
            for pattern in context['patterns'][:3]:
                context_str += f"- {pattern['pattern']} ({pattern['type']})\n"
        
        if 'sentiment' in context:
            sent = context['sentiment']
            context_str += f"\nMarket Sentiment: {sent['overall_sentiment']} (score: {sent['overall_score']:.2f})\n"
        
        if 'prediction' in context:
            pred = context['prediction']
            context_str += f"\nPrice Prediction: ${pred['predicted_price']:,.2f} "
            context_str += f"(confidence: {pred['confidence']:.0%})\n"
        
        return context_str
    
    async def chat(self, message: str, conversation_id: Optional[str] = None,
                  user_id: str = None, context: Optional[Dict] = None) -> Dict:
        """
        Send a message to Claude and get response.
        
        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            user_id: User ID
            context: Optional market/trading context
        
        Returns:
            Response dictionary
        """
        try:
            # Retrieve conversation history
            messages = []
            if conversation_id:
                history = await self._get_conversation_history(conversation_id)
                messages = history
            
            # Add context if provided
            if context:
                context_str = self._format_context(context)
                message = f"{message}\n{context_str}"
            
            # Add user message
            messages.append({
                "role": "user",
                "content": message
            })
            
            # Call Claude API
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=self.system_prompt,
                messages=messages
            )
            
            # Extract response
            assistant_message = response.content[0].text
            
            # Add assistant response to messages
            messages.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            # Generate or use conversation ID
            if not conversation_id:
                import uuid
                conversation_id = str(uuid.uuid4())
            
            # Save conversation
            await self._save_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                messages=messages,
                context=context
            )
            
            # Extract suggested actions (simple keyword-based)
            suggested_actions = self._extract_actions(assistant_message)
            
            return {
                'response': assistant_message,
                'conversation_id': conversation_id,
                'confidence': 0.85,  # Can be refined with more analysis
                'suggested_actions': suggested_actions,
                'timestamp': datetime.utcnow()
            }
        
        except Exception as e:
            logger.error("Claude chat failed", error=str(e))
            raise
    
    def _extract_actions(self, text: str) -> List[str]:
        """Extract suggested actions from response."""
        actions = []
        text_lower = text.lower()
        
        action_keywords = {
            'buy': 'Consider buying',
            'sell': 'Consider selling',
            'hold': 'Hold position',
            'wait': 'Wait for better entry',
            'stop loss': 'Set stop loss',
            'take profit': 'Set take profit',
            'analyze': 'Analyze further',
            'watch': 'Monitor closely'
        }
        
        for keyword, action in action_keywords.items():
            if keyword in text_lower:
                actions.append(action)
        
        return actions[:5]  # Return top 5 actions
    
    async def _get_conversation_history(self, conversation_id: str, 
                                       max_messages: int = 10) -> List[Dict]:
        """Retrieve conversation history from MongoDB."""
        try:
            collection = MongoDB.get_collection('conversations')
            conversation = await collection.find_one({'conversation_id': conversation_id})
            
            if conversation and 'messages' in conversation:
                # Return last N messages
                return conversation['messages'][-max_messages:]
            
            return []
        
        except Exception as e:
            logger.error("Failed to retrieve conversation history", error=str(e))
            return []
    
    async def _save_conversation(self, conversation_id: str, user_id: str,
                                messages: List[Dict], context: Optional[Dict] = None):
        """Save conversation to MongoDB."""
        try:
            collection = MongoDB.get_collection('conversations')
            
            await collection.update_one(
                {'conversation_id': conversation_id},
                {
                    '$set': {
                        'conversation_id': conversation_id,
                        'user_id': user_id,
                        'messages': messages,
                        'context': context,
                        'updated_at': datetime.utcnow()
                    },
                    '$setOnInsert': {
                        'created_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            logger.info("Conversation saved", conversation_id=conversation_id)
        
        except Exception as e:
            logger.error("Failed to save conversation", error=str(e))
    
    async def get_market_insights(self, pair: str, data: Dict) -> str:
        """
        Get AI-powered market insights for a trading pair.
        
        Args:
            pair: Trading pair
            data: Market data including indicators, patterns, sentiment
        
        Returns:
            AI-generated insights
        """
        try:
            prompt = f"""Analyze the following market data for {pair} and provide comprehensive insights:

Technical Indicators:
{self._format_indicators(data.get('indicators', {}))}

Detected Patterns:
{self._format_patterns(data.get('patterns', []))}

Market Sentiment:
{self._format_sentiment(data.get('sentiment', {}))}

Price Prediction:
{self._format_prediction(data.get('prediction', {}))}

Please provide:
1. Overall market assessment
2. Key insights and observations
3. Potential trading opportunities
4. Risk factors to consider
5. Recommended actions with specific entry/exit points
"""
            
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return response.content[0].text
        
        except Exception as e:
            logger.error("Failed to get market insights", error=str(e))
            raise
    
    def _format_indicators(self, indicators: Dict) -> str:
        """Format technical indicators for prompt."""
        if not indicators:
            return "No indicators available"
        
        lines = []
        for key, value in indicators.items():
            if value is not None:
                lines.append(f"- {key.upper()}: {value}")
        
        return "\n".join(lines) if lines else "No indicators available"
    
    def _format_patterns(self, patterns: List[Dict]) -> str:
        """Format patterns for prompt."""
        if not patterns:
            return "No patterns detected"
        
        lines = []
        for pattern in patterns:
            lines.append(f"- {pattern.get('pattern', 'Unknown')} ({pattern.get('type', 'unknown')} - confidence: {pattern.get('confidence', 0):.0%})")
        
        return "\n".join(lines)
    
    def _format_sentiment(self, sentiment: Dict) -> str:
        """Format sentiment for prompt."""
        if not sentiment:
            return "No sentiment data available"
        
        return f"Overall: {sentiment.get('overall_sentiment', 'neutral')} (score: {sentiment.get('overall_score', 0):.2f}, confidence: {sentiment.get('confidence', 0):.0%})"
    
    def _format_prediction(self, prediction: Dict) -> str:
        """Format prediction for prompt."""
        if not prediction:
            return "No prediction available"
        
        return f"Predicted price: ${prediction.get('predicted_price', 0):,.2f} (current: ${prediction.get('current_price', 0):,.2f}, confidence: {prediction.get('confidence', 0):.0%})"
    
    async def analyze_portfolio(self, portfolio_data: Dict, 
                               user_preferences: Dict) -> str:
        """
        Analyze user's portfolio and provide recommendations.
        
        Args:
            portfolio_data: Portfolio holdings and metrics
            user_preferences: User's risk tolerance, goals, etc.
        
        Returns:
            AI-generated portfolio analysis
        """
        try:
            prompt = f"""Analyze this trading portfolio and provide personalized recommendations:

Portfolio Value: ${portfolio_data.get('portfolio_value', 0):,.2f}
Total Return: {portfolio_data.get('total_return', 0):.2f}%
Risk Score: {portfolio_data.get('risk_score', 0):.2f}/10

Asset Allocation:
{self._format_allocation(portfolio_data.get('asset_allocation', {}))}

User Profile:
- Risk Tolerance: {user_preferences.get('risk_tolerance', 'moderate')}
- Investment Horizon: {user_preferences.get('investment_horizon', 'medium')}
- Objectives: {', '.join(user_preferences.get('objectives', []))}

Please provide:
1. Portfolio health assessment
2. Diversification analysis
3. Risk-adjusted recommendations
4. Rebalancing suggestions
5. Potential improvements
"""
            
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return response.content[0].text
        
        except Exception as e:
            logger.error("Failed to analyze portfolio", error=str(e))
            raise
    
    def _format_allocation(self, allocation: Dict) -> str:
        """Format asset allocation for prompt."""
        if not allocation:
            return "No allocation data"
        
        lines = []
        for asset, percentage in allocation.items():
            lines.append(f"- {asset}: {percentage:.1f}%")
        
        return "\n".join(lines)
