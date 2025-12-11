import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Path } from './path.entity';
import { Place } from '../../places/entities/place.entity';

@Entity('path_places')
export class PathPlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pathId: string;

  @ManyToOne(() => Path, path => path.pathPlaces, { onDelete: 'CASCADE' })
  path: Path;

  @Column()
  placeId: string;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  place: Place;

  @Column({ type: 'int', nullable: true }) // Order of the place in the path
  order: number;

  @Column({ type: 'int', nullable: true }) // Estimated time spent at this place (in minutes)
  timeAtPlace: number;

  @Column({ type: 'int', nullable: true }) // Time spent at this place (in minutes) - alias for timeAtPlace
  timeSpent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) // Distance from previous place (in km)
  distanceFromPrevious: number;

  @Column({ type: 'int', nullable: true }) // Travel time from previous place (in minutes)
  travelTimeFromPrevious: number;
}