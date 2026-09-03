import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto, UserMeResponseDto } from '@app/shared';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserMeResponseDto> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException({
        message: 'errors.userIdNotFound',
        args: { id: userId },
      });
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName.trim();
    }
    if (dto.bio !== undefined) {
      user.bio = dto.bio.trim() || null;
    }

    const saved = await this.usersRepo.save(user);

    return {
      id: saved.id,
      email: saved.email,
      displayName: saved.displayName,
      bio: saved.bio ?? undefined,
      status: saved.status,
      roles: (saved.roles ?? []).map((r) => r.role),
      createdAt: saved.createdAt.toISOString(),
    };
  }
}
