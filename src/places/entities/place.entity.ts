import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { PlaceModerationLog } from './place-moderation-log.entity';
import { User } from '../../auth/entities/user.entity';
import { Tag } from './tag.entity';

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

  @Column({
    type: 'enum',
    enum: PlaceStatus,
    default: PlaceStatus.PENDING,
  })
  status: PlaceStatus;

  @Column({ name: 'creator_id', nullable: true, type: 'uuid' })
  creatorId: string;

  @Column({ name: 'moderator_id', nullable: true })
  moderatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'moderator_id' })
  moderator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PlaceModerationLog, moderationLog => moderationLog.place)
  moderationLogs: PlaceModerationLog[];

  @ManyToMany(() => Tag)
  @JoinTable()
  categories: Tag[];
}