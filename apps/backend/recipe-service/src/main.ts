import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { I18nHttpExceptionFilter } from '@app/shared';
import { RecipeServiceModule } from './recipe-service.module';
import { appEnv } from './app.env';

async function bootstrap() {
  const app = await NestFactory.create(RecipeServiceModule);
  const env = app.get<ConfigType<typeof appEnv>>(appEnv.KEY);
  app.useGlobalFilters(new I18nHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(env.port);
  console.log(`🍲 recipe-service running on http://localhost:${env.port}`);
}
bootstrap();
