import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Neo4jProvider } from './providers/neo4j.provider';

@Module({
  imports: [],
  controllers: [FriendsController],
  providers: [
    FriendsService,
    Neo4jProvider,
  ],
  exports: [FriendsService],
})
export class FriendsModule {}