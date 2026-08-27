import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersProxyController } from './users/users-proxy.controller';
import { RecipesProxyController } from './recipes/recipes-proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 0,
    }),
  ],
  controllers: [UsersProxyController, RecipesProxyController],
  providers: [ProxyService],
})
export class ApiGatewayModule {}
