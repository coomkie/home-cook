import { registerAs } from '@nestjs/config';

export const appEnv = registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3002),
  dbHost: process.env.RECIPE_DB_HOST ?? 'localhost',
  dbPort: Number(process.env.RECIPE_DB_PORT ?? 5432),
  dbUser: process.env.RECIPE_DB_USER ?? 'recipes',
  dbPassword: process.env.RECIPE_DB_PASSWORD ?? 'recipes',
  dbName: process.env.RECIPE_DB_NAME ?? 'recipes_db',
  userServiceUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3001',
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ?? 'homecook-dev-access-secret-change-me',
  minioEndpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  minioPort: Number(process.env.MINIO_PORT ?? 9000),
  minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  minioBucket: process.env.MINIO_BUCKET ?? 'homecook',
  minioUseSsl: process.env.MINIO_USE_SSL === 'true',
  /** Public base for browser uploads (Vite may proxy); defaults to localhost:9000 */
  minioPublicEndpoint:
    process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? 'localhost',
  minioPublicPort: Number(
    process.env.MINIO_PUBLIC_PORT ?? process.env.MINIO_PORT ?? 9000,
  ),
}));
