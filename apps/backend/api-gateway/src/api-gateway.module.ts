import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersProxyController } from './users/users-proxy.controller';
import { RecipesProxyController } from './recipes/recipes-proxy.controller';
import { AuthProxyController } from './auth/auth-proxy.controller';
import { ChefsStubController } from './chefs/chefs-stub.controller';
import { MediaProxyController } from './media/media-proxy.controller';
import { CatalogProxyController } from './catalog/catalog-proxy.controller';
import { ProxyService } from './proxy.service';
import { HealthController } from './health.controller';
import { appEnv } from './app.env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appEnv],
    }),
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 0,
    }),
  ],
  controllers: [
    HealthController,
    AuthProxyController,
    UsersProxyController,
    RecipesProxyController,
    CatalogProxyController,
    MediaProxyController,
    ChefsStubController,
  ],
  providers: [ProxyService],
})
export class ApiGatewayModule {}
