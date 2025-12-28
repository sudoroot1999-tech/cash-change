/**
 * WebSocket Test Utilities
 * Helper functions for testing WebSocket connections
 */

import WebSocket from 'ws';

export interface WebSocketTestOptions {
  url: string;
  timeout?: number;
  autoConnect?: boolean;
}

export interface TickerMessage {
  type: 'ticker';
  symbol: string;
  price: string;
  volume: string;
  change: string;
  timestamp: number;
}

export interface OrderBookMessage {
  type: 'orderbook';
  symbol: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  timestamp: number;
}

export interface TradeMessage {
  type: 'trade';
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  side: 'buy' | 'sell';
  timestamp: number;
}

export type WsMessage = TickerMessage | OrderBookMessage | TradeMessage | { type: string; [key: string]: any };

/**
 * WebSocket Test Client
 * A helper class for WebSocket testing
 */
export class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private messages: WsMessage[] = [];
  private url: string;
  private timeout: number;
  private isConnected: boolean = false;
  private onMessageCallback: ((msg: WsMessage) => void) | null = null;

  constructor(options: WebSocketTestOptions) {
    this.url = options.url;
    this.timeout = options.timeout || 5000;
    
    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.timeout}ms`));
      }, this.timeout);

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        clearTimeout(timer);
        this.isConnected = true;
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WsMessage;
          this.messages.push(message);
          if (this.onMessageCallback) {
            this.onMessageCallback(message);
          }
        } catch (e) {
          // Non-JSON message, ignore
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
      });
    });
  }

  /**
   * Send a message to the server
   */
  send(message: object): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, symbol?: string): void {
    this.send({
      action: 'subscribe',
      channel,
      symbol,
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, symbol?: string): void {
    this.send({
      action: 'unsubscribe',
      channel,
      symbol,
    });
  }

  /**
   * Wait for a specific message type
   */
  waitForMessage(type: string, timeoutMs?: number): Promise<WsMessage> {
    const timeout = timeoutMs || this.timeout;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.onMessageCallback = null;
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);

      // Check existing messages first
      const existing = this.messages.find(m => m.type === type);
      if (existing) {
        clearTimeout(timer);
        resolve(existing);
        return;
      }

      // Wait for new message
      this.onMessageCallback = (msg) => {
        if (msg.type === type) {
          clearTimeout(timer);
          this.onMessageCallback = null;
          resolve(msg);
        }
      };
    });
  }

  /**
   * Wait for multiple messages
   */
  async waitForMessages(count: number, timeoutMs?: number): Promise<WsMessage[]> {
    const timeout = timeoutMs || this.timeout;
    const startTime = Date.now();
    const startCount = this.messages.length;

    while (this.messages.length - startCount < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for ${count} messages`);
      }
      await this.sleep(50);
    }

    return this.messages.slice(startCount, startCount + count);
  }

  /**
   * Get all received messages
   */
  getMessages(): WsMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages of a specific type
   */
  getMessagesByType(type: string): WsMessage[] {
    return this.messages.filter(m => m.type === type);
  }

  /**
   * Clear message buffer
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Close the connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a WebSocket test client
 */
export function createWsClient(url: string, options?: Partial<WebSocketTestOptions>): WebSocketTestClient {
  return new WebSocketTestClient({ url, ...options });
}

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!(await condition())) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Condition timeout');
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
