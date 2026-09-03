import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UnitType = 'MASS' | 'VOLUME' | 'COUNT' | 'SPOON' | 'CUSTOM';

@Entity('units')
export class UnitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40, unique: true })
  code: string;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({ name: 'unit_type', length: 20 })
  unitType: UnitType;

  @Column({ name: 'allows_decimal', type: 'boolean', default: true })
  allowsDecimal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
