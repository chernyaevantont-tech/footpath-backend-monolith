import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Path } from '../../paths/entities/path.entity';
import { WalkParticipant } from './walk-participant.entity';

export enum WalkStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('walks')
export class Walk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  pathId: string;

  @ManyToOne(() => Path, { nullable: true })
  path: Path;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ 
    type: 'enum',
    enum: WalkStatus,
    default: WalkStatus.PLANNED,
  })
  status: WalkStatus;

  @Column({ nullable: true })
  creatorId: string;

  @ManyToOne(() => User, { nullable: true })
  creator: User;

  @OneToMany(() => WalkParticipant, participant => participant.walk, { cascade: true })
  participants: WalkParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}