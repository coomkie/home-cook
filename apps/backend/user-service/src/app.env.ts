import { registerAs } from '@nestjs/config';

export const appEnv = registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3001),
  dbHost: process.env.USER_DB_HOST ?? 'localhost',
  dbPort: Number(process.env.USER_DB_PORT ?? 5432),
  dbUser: process.env.USER_DB_USER ?? 'recipes',
  dbPassword: process.env.USER_DB_PASSWORD ?? 'recipes',
  dbName: process.env.USER_DB_NAME ?? 'users_db',
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ?? 'homecook-dev-access-secret-change-me',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'homecook-dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@homecook.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
  seedAdminName: process.env.SEED_ADMIN_NAME ?? 'Home-cook Admin',
}));
