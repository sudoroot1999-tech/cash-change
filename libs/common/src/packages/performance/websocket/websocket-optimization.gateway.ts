import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Optimized WebSocket Gateway with compression, batching, and connection pooling
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  // Enable compression
  perMessageDeflate: {
    threshold: 1024, // Compress messages > 1KB
    zlibDeflateOptions: {
      chunkSize: 8 * 1024,
      memLevel: 7,
      level: 3, // Balance between speed and compression
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
  },
  // Connection settings
  pingInterval: 25000, // 25 seconds
  pingTimeout: 20000,  // 20 seconds
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true,
})
export class OptimizedWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OptimizedWebSocketGateway.name);
  private messageBatches: Map<string, any[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchDelay = 50; // Batch messages for 50ms
  private readonly maxBatchSize = 100;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized with optimizations');
    
    // Configure Socket.IO for performance
    server.engine.on('connection_error', (err) => {
      this.logger.error('Connection error:', err);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send connection acknowledgment
    client.emit('connected', {
      clientId: client.id,
      timestamp: Date.now(),
    });

    // Set up heartbeat mechanism
    this.setupHeartbeat(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up batches for this client
    this.clearBatchTimer(client.id);
    this.messageBatches.delete(client.id);
  }

  /**
   * Heartbeat mechanism to detect stale connections
   */
  private setupHeartbeat(client: Socket) {
    const interval = setInterval(() => {
      if (!client.connected) {
        clearInterval(interval);
        return;
      }
      client.emit('ping', { timestamp: Date.now() });
    }, 30000); // Every 30 seconds

    client.on('pong', () => {
      // Client is alive
    });

    client.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  /**
   * Send message with automatic batching
   */
  async sendBatched(clientId: string, event: string, data: any) {
    const key = `${clientId}:${event}`;
    
    // Get or create batch
    if (!this.messageBatches.has(key)) {
      this.messageBatches.set(key, []);
    }
    
    const batch = this.messageBatches.get(key)!;
    batch.push(data);

    // Send immediately if batch is full
    if (batch.length >= this.maxBatchSize) {
      this.flushBatch(clientId, event);
      return;
    }

    // Schedule batch flush
    if (!this.batchTimers.has(key)) {
      const timer = setTimeout(() => {
        this.flushBatch(clientId, event);
      }, this.batchDelay);
      this.batchTimers.set(key, timer);
    }
  }

  /**
   * Flush batched messages
   */
  private flushBatch(clientId: string, event: string) {
    const key = `${clientId}:${event}`;
    const batch = this.messageBatches.get(key);

    if (batch && batch.length > 0) {
      this.server.to(clientId).emit(`${event}_batch`, batch);
      this.messageBatches.set(key, []);
    }

    this.clearBatchTimer(key);
  }

  /**
   * Clear batch timer
   */
  private clearBatchTimer(key: string) {
    const timer = this.batchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(key);
    }
  }

  /**
   * Broadcast to room with compression
   */
  async broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  /**
   * Subscribe client to specific channels
   */
  async subscribeToChannel(client: Socket, channel: string) {
    await client.join(channel);
    this.logger.debug(`Client ${client.id} subscribed to ${channel}`);
    client.emit('subscribed', { channel });
  }

  /**
   * Unsubscribe client from channel
   */
  async unsubscribeFromChannel(client: Socket, channel: string) {
    await client.leave(channel);
    this.logger.debug(`Client ${client.id} unsubscribed from ${channel}`);
    client.emit('unsubscribed', { channel });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedClients: this.server.sockets.sockets.size,
      rooms: this.server.sockets.adapter.rooms.size,
      batchQueues: this.messageBatches.size,
    };
  }
}
