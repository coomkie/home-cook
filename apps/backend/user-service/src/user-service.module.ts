import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { UserEntity } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('USER_DB_HOST', 'localhost'),
        port: Number(config.get('USER_DB_PORT', 5432)),
        username: config.get<string>('USER_DB_USER', 'recipes'),
        password: config.get<string>('USER_DB_PASSWORD', 'recipes'),
        database: config.get<string>('USER_DB_NAME', 'users_db'),
        entities: [UserEntity],
        synchronize: true, // học tập OK; prod dùng migration
      }),
    }),
    UsersModule,
  ],
})
export class UserServiceModule {}
