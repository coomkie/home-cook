import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { UserRoleEntity } from './user-role.entity';
import { RefreshTokenEntity } from './refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      RefreshTokenEntity,
    ]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
