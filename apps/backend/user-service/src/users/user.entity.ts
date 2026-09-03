import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRoleEntity } from './user-role.entity';
import { RefreshTokenEntity } from './refresh-token.entity';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @OneToMany(() => UserRoleEntity, (role) => role.user, { cascade: true })
  roles: UserRoleEntity[];

  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
