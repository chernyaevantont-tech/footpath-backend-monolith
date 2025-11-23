import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';
import { Tag } from './entities/tag.entity';
import { PlaceModerationLog } from './entities/place-moderation-log.entity';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, Tag, PlaceModerationLog]),
    forwardRef(() => RecommendationsModule), // For circular dependency
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}