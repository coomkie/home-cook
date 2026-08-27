import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto, UserResponseDto } from '@app/shared';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} already exists`);
    }

    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      bio: dto.bio ?? null,
    });
    const saved = await this.usersRepo.save(user);
    return this.toResponse(saved);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepo.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.toResponse(u));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.toResponse(user);
  }

  private toResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
