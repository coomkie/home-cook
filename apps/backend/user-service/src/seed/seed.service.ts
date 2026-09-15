import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { appEnv } from '../app.env';
import { UserEntity } from '../users/user.entity';
import { UserRoleEntity } from '../users/user-role.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly rolesRepo: Repository<UserRoleEntity>,
    @Inject(appEnv.KEY) private readonly env: ConfigType<typeof appEnv>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const email = this.env.seedAdminEmail.trim().toLowerCase();
    if (!email) return;

    let user = await this.usersRepo.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(this.env.seedAdminPassword, 10);
      user = await this.usersRepo.save(
        this.usersRepo.create({
          email,
          passwordHash,
          displayName: this.env.seedAdminName.trim() || 'Admin',
          bio: 'Seeded admin account',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        }),
      );
      this.logger.log(`Admin user created (${email})`);
    }

    const wantRoles = ['USER', 'ADMIN'] as const;
    const have = new Set((user.roles ?? []).map((r) => r.role));
    for (const role of wantRoles) {
      if (have.has(role)) continue;
      await this.rolesRepo.save(
        this.rolesRepo.create({ userId: user.id, role }),
      );
    }

    this.logger.log(
      `Admin ready: ${email} / (password from SEED_ADMIN_PASSWORD) roles=USER,ADMIN`,
    );
  }
}
