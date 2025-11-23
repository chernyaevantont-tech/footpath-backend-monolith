import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { PlaceModerationLog } from './place-moderation-log.entity';
import { User } from '../../auth/entities/user.entity';

export enum PlaceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326
  })
  coordinates: string; // Format: "POINT(longitude latitude)"

  @Column({ type: 'simple-array', nullable: true }) // Array of tag IDs
  tagIds: string[];

  @Column({
    type: 'enum',
    enum: PlaceStatus,
    default: PlaceStatus.PENDING,
  })
  status: PlaceStatus;

  @Column({ nullable: true })
  moderatorId: string;

  @ManyToOne(() => User, user => user.id, { nullable: true })
  moderator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PlaceModerationLog, moderationLog => moderationLog.place)
  moderationLogs: PlaceModerationLog[];
}