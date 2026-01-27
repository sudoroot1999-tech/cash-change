"""WebSocket handler for real-time signal streaming."""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, List
import asyncio
import json
from datetime import datetime
import structlog

from src.schemas import WSMessage, WSSubscription, SignalTypeEnum
from src.config import settings

logger = structlog.get_logger()


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, WSSubscription] = {}
        self.max_connections = settings.ws_max_connections
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept new WebSocket connection."""
        if len(self.active_connections) >= self.max_connections:
            await websocket.close(code=1008, reason="Max connections reached")
            return False
        
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info("WebSocket connected", client_id=client_id)
        return True
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        logger.info("WebSocket disconnected", client_id=client_id)
    
    def subscribe(self, client_id: str, subscription: WSSubscription):
        """Subscribe client to pairs and signals."""
        self.subscriptions[client_id] = subscription
        logger.info("Client subscribed",
                   client_id=client_id,
                   pairs=subscription.pairs)
    
    async def send_personal_message(self, message: dict, client_id: str):
        """Send message to specific client."""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error("Failed to send message", client_id=client_id, error=str(e))
    
    async def broadcast(self, message: dict, pair: str = None):
        """Broadcast message to all subscribed clients."""
        disconnected = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                # Check if client is subscribed to this pair
                if pair and client_id in self.subscriptions:
                    subscription = self.subscriptions[client_id]
                    if pair not in subscription.pairs:
                        continue
                
                await websocket.send_json(message)
            
            except WebSocketDisconnect:
                disconnected.append(client_id)
            except Exception as e:
                logger.error("Broadcast failed", client_id=client_id, error=str(e))
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def send_signal(self, signal: dict):
        """Send trading signal to subscribed clients."""
        pair = signal.get('pair')
        signal_type = signal.get('signal_type')
        confidence = signal.get('confidence', 0)
        
        disconnected = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                # Check subscription filters
                if client_id not in self.subscriptions:
                    continue
                
                subscription = self.subscriptions[client_id]
                
                # Check pair filter
                if pair not in subscription.pairs:
                    continue
                
                # Check signal type filter
                if subscription.signal_types:
                    if signal_type not in [st.value for st in subscription.signal_types]:
                        continue
                
                # Check confidence filter
                if confidence < subscription.min_confidence:
                    continue
                
                # Send signal
                message = WSMessage(
                    type="signal",
                    data=signal
                )
                await websocket.send_json(message.dict())
            
            except WebSocketDisconnect:
                disconnected.append(client_id)
            except Exception as e:
                logger.error("Failed to send signal", client_id=client_id, error=str(e))
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def send_price_update(self, pair: str, price: float):
        """Send price update to subscribed clients."""
        message = WSMessage(
            type="price",
            data={
                'pair': pair,
                'price': price,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        await self.broadcast(message.dict(), pair=pair)
    
    async def send_heartbeat(self):
        """Send heartbeat to all connected clients."""
        message = WSMessage(
            type="heartbeat",
            data={'status': 'alive'}
        )
        
        await self.broadcast(message.dict())
    
    def get_connection_count(self) -> int:
        """Get number of active connections."""
        return len(self.active_connections)
    
    def get_subscribed_pairs(self) -> Set[str]:
        """Get all subscribed pairs."""
        pairs = set()
        for subscription in self.subscriptions.values():
            pairs.update(subscription.pairs)
        return pairs


# Global connection manager
manager = ConnectionManager()


async def heartbeat_task():
    """Background task to send heartbeats."""
    while True:
        try:
            await asyncio.sleep(settings.ws_heartbeat_interval)
            await manager.send_heartbeat()
        except Exception as e:
            logger.error("Heartbeat task failed", error=str(e))


async def signal_monitor_task():
    """Background task to monitor and broadcast new signals."""
    from src.database import get_db, MongoDB
    from src.models import TradingSignal
    from sqlalchemy import select, desc
    from datetime import timedelta
    
    last_check = datetime.utcnow()
    
    while True:
        try:
            await asyncio.sleep(10)  # Check every 10 seconds
            
            # Get subscribed pairs
            pairs = manager.get_subscribed_pairs()
            
            if not pairs:
                continue
            
            # Check for new signals
            async for db in get_db():
                current_time = datetime.utcnow()
                
                for pair in pairs:
                    result = await db.execute(
                        select(TradingSignal)
                        .where(
                            TradingSignal.pair == pair,
                            TradingSignal.created_at > last_check,
                            TradingSignal.is_active == True
                        )
                        .order_by(desc(TradingSignal.created_at))
                        .limit(10)
                    )
                    signals = result.scalars().all()
                    
                    # Broadcast new signals
                    for signal in signals:
                        signal_data = {
                            'id': str(signal.id),
                            'pair': signal.pair,
                            'signal_type': signal.signal_type.value,
                            'signal_source': signal.signal_source.value,
                            'confidence': signal.confidence,
                            'price': signal.price,
                            'target_price': signal.target_price,
                            'stop_loss': signal.stop_loss,
                            'take_profit': signal.take_profit,
                            'reasoning': signal.reasoning,
                            'created_at': signal.created_at.isoformat()
                        }
                        
                        await manager.send_signal(signal_data)
                
                last_check = current_time
                break
        
        except Exception as e:
            logger.error("Signal monitor task failed", error=str(e))


async def price_stream_task():
    """Background task to stream price updates."""
    from src.services.market_data import MarketDataService
    
    market_service = MarketDataService()
    
    while True:
        try:
            await asyncio.sleep(5)  # Update every 5 seconds
            
            # Get subscribed pairs
            pairs = manager.get_subscribed_pairs()
            
            if not pairs:
                continue
            
            # Fetch and broadcast prices
            for pair in pairs:
                try:
                    price = await market_service.get_current_price(pair)
                    await manager.send_price_update(pair, price)
                except Exception as e:
                    logger.warning("Failed to fetch price", pair=pair, error=str(e))
        
        except Exception as e:
            logger.error("Price stream task failed", error=str(e))


async def handle_websocket(websocket: WebSocket, client_id: str):
    """Handle WebSocket connection."""
    connected = await manager.connect(websocket, client_id)
    
    if not connected:
        return
    
    try:
        # Send welcome message
        welcome = WSMessage(
            type="connected",
            data={
                'client_id': client_id,
                'message': 'Connected to AI Assistant signal stream'
            }
        )
        await websocket.send_json(welcome.dict())
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            # Handle subscription
            if data.get('type') == 'subscribe':
                subscription = WSSubscription(**data.get('data', {}))
                manager.subscribe(client_id, subscription)
                
                response = WSMessage(
                    type="subscribed",
                    data={
                        'pairs': subscription.pairs,
                        'message': 'Subscribed successfully'
                    }
                )
                await manager.send_personal_message(response.dict(), client_id)
            
            # Handle unsubscribe
            elif data.get('type') == 'unsubscribe':
                if client_id in manager.subscriptions:
                    del manager.subscriptions[client_id]
                
                response = WSMessage(
                    type="unsubscribed",
                    data={'message': 'Unsubscribed successfully'}
                )
                await manager.send_personal_message(response.dict(), client_id)
            
            # Handle ping
            elif data.get('type') == 'ping':
                response = WSMessage(
                    type="pong",
                    data={'message': 'pong'}
                )
                await manager.send_personal_message(response.dict(), client_id)
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error("WebSocket error", client_id=client_id, error=str(e))
        manager.disconnect(client_id)
