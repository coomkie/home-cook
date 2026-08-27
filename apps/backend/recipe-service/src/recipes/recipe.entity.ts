import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type Difficulty = 'easy' | 'medium' | 'hard';

@Entity('recipes')
export class RecipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  ingredients: Array<{ name: string; amount: string }>;

  @Column({ type: 'jsonb' })
  steps: string[];

  @Column({ name: 'cook_time_minutes', type: 'int' })
  cookTimeMinutes: number;

  @Column({ length: 20 })
  difficulty: Difficulty;

  /** Chỉ lưu UUID — KHÔNG FK sang users_db (database-per-service) */
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
