import { Injectable } from "@nestjs/common";
import { QueueNames, QueueService } from "@exchange/common";
import { UsersService } from "../users.service";


@Injectable()
export class UserProfileSyncWorker {
  constructor(
    private readonly queueService: QueueService,
    private readonly userService: UsersService,
  ) {}

  onModuleInit() {
    this.queueService.createWorker(
      QueueNames.PROFILE_SYNC,
      async (job) => {
        const { userId } = job.data;
        await this.userService.createUserProfile(userId);
      },
      {
        concurrency: 3,
      },
    );
  }
}
