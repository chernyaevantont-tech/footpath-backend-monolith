import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { PathPlace } from './path-place.entity';
import { User } from '../../auth/entities/user.entity';

export enum PathStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('paths')
export class Path {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) // in kilometers
  distance: number;

  @Column({ type: 'int', default: 0 }) // in minutes
  totalTime: number;

  @Column({
    type: 'enum',
    enum: PathStatus,
    default: PathStatus.DRAFT,
  })
  status: PathStatus;

  @Column({ nullable: true })
  creatorId: string;

  @ManyToOne(() => User, { nullable: true })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // One-to-many with PathPlace entities
  @OneToMany(() => PathPlace, pathPlace => pathPlace.path, { cascade: true })
  pathPlaces: PathPlace[];
}