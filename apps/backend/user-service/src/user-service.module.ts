import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SeedModule } from './seed/seed.module';
import { UserEntity } from './users/user.entity';
import { UserRoleEntity } from './users/user-role.entity';
import { RefreshTokenEntity } from './users/refresh-token.entity';
import { HealthController } from './health.controller';
import { appEnv } from './app.env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appEnv],
    }),
    TypeOrmModule.forRootAsync({
      inject: [appEnv.KEY],
      useFactory: (env: ConfigType<typeof appEnv>) => ({
        type: 'postgres' as const,
        host: env.dbHost,
        port: env.dbPort,
        username: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        entities: [UserEntity, UserRoleEntity, RefreshTokenEntity],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class UserServiceModule {}
