import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RecipeServiceModule } from './recipe-service.module';

async function bootstrap() {
  const app = await NestFactory.create(RecipeServiceModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3002);
  console.log(`🍲 recipe-service running on http://localhost:3002`);
}
bootstrap();
