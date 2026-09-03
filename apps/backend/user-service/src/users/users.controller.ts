import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UpdateProfileDto, UserMeResponseDto, UserResponseDto } from '@app/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { RequestUser } from '../auth/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: RequestUser): Promise<UserMeResponseDto> {
    return this.authService.getMe(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserMeResponseDto> {
    return this.usersService.updateProfile(user.userId, dto);
  }

  /** Internal: recipe-service gọi để resolve author. */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        message: 'errors.userIdNotFound',
        args: { id },
      });
    }
    return {
      id: user.id,
      name: user.displayName,
      email: user.email,
      bio: user.bio ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
