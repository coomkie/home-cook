import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  AuthTokensDto,
  LoginDto,
  RegisterDto,
  UserMeResponseDto,
} from '@app/shared';
import { UserEntity } from '../users/user.entity';
import { UserRoleEntity } from '../users/user-role.entity';
import { RefreshTokenEntity } from '../users/refresh-token.entity';
import { appEnv } from '../app.env';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly rolesRepo: Repository<UserRoleEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
    private readonly jwt: JwtService,
    @Inject(appEnv.KEY) private readonly env: ConfigType<typeof appEnv>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.usersRepo.exist({ where: { email } });
    if (exists) {
      throw new ConflictException({
        message: 'errors.emailAlreadyRegistered',
        args: { email },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email,
      passwordHash,
      displayName: dto.displayName.trim(),
      bio: dto.bio?.trim() ?? null,
      status: 'ACTIVE',
    });
    const saved = await this.usersRepo.save(user);

    await this.rolesRepo.save(
      this.rolesRepo.create({ userId: saved.id, role: 'USER' }),
    );

    return this.issueTokens(saved.id, saved.email, ['USER']);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepo.findOne({
      where: { email },
      relations: ['roles'],
    });
    if (!user) {
      throw new UnauthorizedException('errors.invalidCredentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'errors.accountNotActive',
        args: { status: user.status },
      });
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('errors.invalidCredentials');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.save(user);

    const roles = (user.roles ?? []).map((r) => r.role);
    if (roles.length === 0) roles.push('USER');

    return this.issueTokens(user.id, user.email, roles);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const hash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user', 'user.roles'],
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    stored.revokedAt = new Date();
    await this.refreshRepo.save(stored);

    const roles = (stored.user.roles ?? []).map((r) => r.role);
    if (roles.length === 0) roles.push('USER');

    return this.issueTokens(stored.userId, stored.user.email, roles, stored.familyId);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const hash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findOne({ where: { tokenHash: hash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshRepo.save(stored);
    }
    return { ok: true };
  }

  async getMe(userId: string): Promise<UserMeResponseDto> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new UnauthorizedException('errors.userNotFound');
    }
    return this.toMe(user);
  }

  private async issueTokens(
    userId: string,
    email: string,
    roles: Array<'USER' | 'MODERATOR' | 'ADMIN'>,
    familyId?: string,
  ): Promise<AuthTokensDto> {
    const accessExpiresIn = this.env.jwtAccessExpiresIn;
    const refreshExpiresIn = this.env.jwtRefreshExpiresIn;
    const resolvedFamilyId = familyId ?? randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, roles },
      {
        secret: this.env.jwtAccessSecret,
        expiresIn: this.parseDurationMs(accessExpiresIn) / 1000,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.parseDurationMs(refreshExpiresIn),
    );

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash: this.hashToken(refreshToken),
        familyId: resolvedFamilyId,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      tokenType: 'Bearer',
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(match[1]);
    const unit = match[2];
    const mult =
      unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return n * mult;
  }

  private toMe(user: UserEntity): UserMeResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio ?? undefined,
      status: user.status,
      roles: (user.roles ?? []).map((r) => r.role),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
