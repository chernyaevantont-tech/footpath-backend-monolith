import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { PlaceEmbedding } from './entities/place-embedding.entity';
import { Place } from '../places/entities/place.entity';
import { User } from '../auth/entities/user.entity';
import { Walk } from '../walks/entities/walk.entity';
import { WalkParticipant } from '../walks/entities/walk-participant.entity';
import { Path } from '../paths/entities/path.entity';
import { PathPlace } from '../paths/entities/path-place.entity';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaceEmbedding,
      Place,
      User,
      Walk,
      WalkParticipant,
      Path,
      PathPlace,
    ]),
    forwardRef(() => PlacesModule), // For the circular dependency with places service
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}