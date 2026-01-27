import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { P2pAd } from './entities/p2p-ad.entity';
import { P2pTrade } from './entities/p2p-trade.entity';
import { P2pDispute } from './entities/p2p-dispute.entity';
import { UserRating } from './entities/user-rating.entity';
import { TradeMessage } from './entities/trade-message.entity';
import { UserStatistics } from './entities/user-statistics.entity';

// Services
import { AdService } from './services/ad.service';
import { TradeService } from './services/trade.service';
import { DisputeService } from './services/dispute.service';
import { RatingService } from './services/rating.service';
import { StatisticsService } from './services/statistics.service';
import { ChatService } from './services/chat.service';
import { EscrowService } from './services/escrow.service';
import { NotificationService } from './services/notification.service';
import { FraudPreventionService } from './services/fraud-prevention.service';
import { SchedulerService } from './services/scheduler.service';

// Controllers
import { AdController } from './controllers/ad.controller';
import { TradeController } from './controllers/trade.controller';
import { DisputeController } from './controllers/dispute.controller';
import { RatingController } from './controllers/rating.controller';
import { StatisticsController } from './controllers/statistics.controller';
import { ChatController } from './controllers/chat.controller';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      P2pAd,
      P2pTrade,
      P2pDispute,
      UserRating,
      TradeMessage,
      UserStatistics,
    ]),
  ],
  controllers: [
    AdController,
    TradeController,
    DisputeController,
    RatingController,
    StatisticsController,
    ChatController,
  ],
  providers: [
    AdService,
    TradeService,
    DisputeService,
    RatingService,
    StatisticsService,
    ChatService,
    EscrowService,
    NotificationService,
    FraudPreventionService,
    SchedulerService,
    ChatGateway,
  ],
})
export class P2pModule {}
