import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload} from '@nestjs/microservices';
import { RABBITMQ } from '@exchange/common';
import { WalletsService } from './wallets.service';

@Controller()
export class WalletsEventsController {
  private readonly logger = new Logger(WalletsEventsController.name);

  constructor(private readonly walletsService: WalletsService) {}

  @EventPattern(RABBITMQ.QUEUES.TRADE_EXECUTED)
  async handleTradeExecuted(@Payload() data: any): Promise<void> {
    this.logger.log(`Received trade executed event: ${data.tradeId}`);
    
    try {
        // Data contains: buyerId, sellerId, price, quantity, pairId (symbol usually needed for assets)
        // We need symbol to determine assets. data.pairId might need mapping or be the symbol itself if string.
        // In orders.service.ts, pairId was passed as 'placeholder-pair-id'. 
        // Wait, orders.service.ts emitted: tradeId, pairId, buyerId, sellerId, price, quantity
        
        // We really need the SYMBOL (BTC/USDT) to know which assets to debit/credit.
        // Since orders.service.ts passed 'placeholder-pair-id', we have a problem. 
        // We should fix orders.service.ts to also emit symbol or correct pairId.  
        
        // Assuming for now we can get assets from somewhere, or we add logic to WalletsService.
        // Let's assume data has 'symbol' if we fix the emitter.
        // Let's check orders.service.ts emission again.
        
        // If data.symbol is present:
        if (data.symbol) {
            const [base, quote] = data.symbol.split('/'); // e.g. BTC/USDT
            
            const cost = parseFloat(data.price) * parseFloat(data.quantity);
            const quantity = parseFloat(data.quantity);

            // Buyer: Gets Base, Pays Quote
            // Seller: Pays Base, Gets Quote
            
            // 1. Buyer: Unlock Quote (cost) -> Deduct Quote (cost) -> Credit Base (quantity)
            // Actually, the Locked Quote amount is DEBITED directly.
            // But wait, the fee logic and partial fills?
            // "Locked" balance is usually "reserved". 
            // Correct flow:
            // Buyer: Debit Locked Quote (cost). Credit Available Base (quantity).
            // Seller: Debit Locked Base (quantity). Credit Available Quote (cost).
            
            await this.walletsService.settleTrade(
                data.buyerId, 
                data.sellerId, 
                base, 
                quote, 
                quantity.toString(), 
                cost.toString()
            );
        } else {
             this.logger.warn(`Trade event missing symbol: ${JSON.stringify(data)}`);
        }

    } catch (error) {
      this.logger.error('Error handling trade executed event', error);
    }
  }
}
