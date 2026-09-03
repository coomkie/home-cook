import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { ProxyService } from '../proxy.service';
import { appEnv } from '../app.env';

@Controller()
export class CatalogProxyController {
  private readonly recipeServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.recipeServiceUrl = env.recipeServiceUrl;
  }

  private fwd(authorization?: string, acceptLanguage?: string) {
    return { authorization, 'accept-language': acceptLanguage };
  }

  @Get('units')
  units(@Headers('accept-language') acceptLanguage?: string) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/units',
      undefined,
      undefined,
      this.fwd(undefined, acceptLanguage),
    );
  }

  @Get('ingredients')
  ingredients(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/ingredients',
      undefined,
      { q, status },
      this.fwd(undefined, acceptLanguage),
    );
  }

  @Post('ingredients')
  propose(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      '/ingredients',
      body,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Get('ingredients/moderation')
  moderation(
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/ingredients/moderation',
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Post('ingredients/:id/approve')
  approve(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      `/ingredients/${id}/approve`,
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Post('ingredients/:id/reject')
  reject(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      `/ingredients/${id}/reject`,
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }
}
