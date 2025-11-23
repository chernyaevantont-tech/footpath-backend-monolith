import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalksController } from './walks.controller';
import { WalksService } from './walks.service';
import { Walk } from './entities/walk.entity';
import { WalkParticipant } from './entities/walk-participant.entity';
import { User } from '../auth/entities/user.entity';
import { Path } from '../paths/entities/path.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Walk, WalkParticipant, User, Path]),
  ],
  controllers: [WalksController],
  providers: [WalksService],
  exports: [WalksService],
})
export class WalksModule {}