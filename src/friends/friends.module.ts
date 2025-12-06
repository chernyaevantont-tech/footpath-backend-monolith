import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Neo4jProvider } from './providers/neo4j.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [FriendsController],
  providers: [
    FriendsService,
    Neo4jProvider,
  ],
  exports: [FriendsService],
})
export class FriendsModule {}