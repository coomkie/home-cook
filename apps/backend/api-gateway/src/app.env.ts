import { registerAs } from '@nestjs/config';

export const appEnv = registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3000),
  userServiceUrl:
    process.env.USER_SERVICE_URL ?? 'http://localhost:3001',
  recipeServiceUrl:
    process.env.RECIPE_SERVICE_URL ?? 'http://localhost:3002',
}));
