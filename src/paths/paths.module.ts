import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathsController } from './paths.controller';
import { PathsService } from './paths.service';
import { PathCalculationService } from './utils/path-calculation.service';
import { AdvancedPathfindingService } from './utils/advanced-pathfinding.service';
import { Path } from './entities/path.entity';
import { PathPlace } from './entities/path-place.entity';
import { Place } from '../places/entities/place.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Path, PathPlace, Place]),
  ],
  controllers: [PathsController],
  providers: [
    PathsService,
    PathCalculationService,
    AdvancedPathfindingService,
  ],
  exports: [PathsService],
})
export class PathsModule {}