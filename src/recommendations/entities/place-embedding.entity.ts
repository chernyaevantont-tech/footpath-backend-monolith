import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Place } from '../../places/entities/place.entity';
import { VectorTransformer } from '../utils/vector-transformer';

@Entity('place_embeddings')
export class PlaceEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  placeId: string;

  @OneToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  // For now, storing as JSON string for compatibility
  @Column('simple-json')
  embedding: number[]; // Vector representation of the place

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}