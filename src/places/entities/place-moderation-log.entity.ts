import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { Place } from './place.entity';
import { User } from '../../auth/entities/user.entity';

export enum ModerationAction {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UPDATED = 'updated',
}

@Entity('place_moderation_logs')
export class PlaceModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ModerationAction })
  action: ModerationAction;

  @Column({ nullable: true })
  placeId: string;

  @ManyToOne(() => Place, place => place.moderationLogs)
  place: Place;

  @Column({ nullable: true })
  moderatorId: string;

  @ManyToOne(() => User, { nullable: true })
  moderator: User;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}