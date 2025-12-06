import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable, BeforeInsert, BeforeUpdate } from 'typeorm';
import { PlaceModerationLog } from './place-moderation-log.entity';
import { User } from '../../auth/entities/user.entity';
import { Tag } from './tag.entity';
import { generatePlaceContentHash } from '../utils/hash.util';

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

  @Column({ name: 'content_hash', nullable: true, length: 32 })
  contentHash: string;

  @OneToMany(() => PlaceModerationLog, moderationLog => moderationLog.place)
  moderationLogs: PlaceModerationLog[];

  @ManyToMany(() => Tag, tag => tag.places, { cascade: true })
  @JoinTable({
    name: 'place_tags', // Specify the join table name
    joinColumn: {
      name: 'place_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id'
    }
  })
  tags: Tag[];

  /**
   * Generate content hash before inserting a new place.
   * This allows mobile clients to detect changes efficiently.
   */
  @BeforeInsert()
  generateHashOnInsert() {
    this.contentHash = generatePlaceContentHash(this);
  }

  /**
   * Regenerate content hash before updating a place.
   * This ensures the hash is always up-to-date with the content.
   */
  @BeforeUpdate()
  generateHashOnUpdate() {
    this.contentHash = generatePlaceContentHash(this);
  }
}