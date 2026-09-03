import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nHttpExceptionFilter } from '@app/shared';
import { ApiGatewayModule } from './api-gateway.module';
import { appEnv } from './app.env';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  const env = app.get<ConfigType<typeof appEnv>>(appEnv.KEY);

  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });
  app.useGlobalFilters(new I18nHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Home-cook API')
    .setDescription(
      'API Gateway — Phase 0 (Auth + User). Bearer JWT cho /users/me.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Register / login / refresh / logout')
    .addTag('users', 'Profile (JWT required)')
    .addTag('health', 'Service health')
    .addTag('stubs', 'Phase 1+ placeholders')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(env.port);
  console.log(`🚪 api-gateway running on http://localhost:${env.port}`);
  console.log(`📘 Swagger UI: http://localhost:${env.port}/api/docs`);
}
bootstrap();
