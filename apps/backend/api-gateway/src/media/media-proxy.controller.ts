import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { ProxyService } from '../proxy.service';
import { appEnv } from '../app.env';

@Controller('media')
export class MediaProxyController {
  private readonly recipeServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.recipeServiceUrl = env.recipeServiceUrl;
  }

  @Post('uploads/initiate')
  initiate(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      '/media/uploads/initiate',
      body,
      undefined,
      { authorization, 'accept-language': acceptLanguage },
    );
  }

  @Post('uploads/:id/complete')
  complete(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      `/media/uploads/${id}/complete`,
      undefined,
      undefined,
      { authorization, 'accept-language': acceptLanguage },
    );
  }

  @Get(':id/url')
  url(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      `/media/${id}/url`,
      undefined,
      undefined,
      { 'accept-language': acceptLanguage },
    );
  }
}
