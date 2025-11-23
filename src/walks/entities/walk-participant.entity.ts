import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Walk } from './walk.entity';

export enum ParticipantStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  NO_RESPONSE = 'no_response'
}

@Entity('walk_participants')
export class WalkParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walkId: string;

  @ManyToOne(() => Walk, walk => walk.participants)
  walk: Walk;

  @Column()
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ 
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'boolean', default: false })
  attended: boolean; // Whether the participant actually attended the walk

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date;
}