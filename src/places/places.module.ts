import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';
import { Tag } from './entities/tag.entity';
import { PlaceModerationLog } from './entities/place-moderation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, Tag, PlaceModerationLog]),
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}