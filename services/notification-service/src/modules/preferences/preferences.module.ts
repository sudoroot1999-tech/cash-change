import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationPreference } from './entities/preference.entity';
import { PreferenceService } from './preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserNotificationPreference])],
  controllers: [PreferencesController],
  providers: [PreferenceService],
  exports: [PreferenceService],
})
export class PreferencesModule {}
