import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/user.entity';
import { UserRoleEntity } from '../users/user-role.entity';
import { RefreshTokenEntity } from '../users/refresh-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { appEnv } from '../app.env';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      RefreshTokenEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [appEnv.KEY],
      useFactory: (env: ConfigType<typeof appEnv>) => ({
        secret: env.jwtAccessSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule {}
