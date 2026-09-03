import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthTokensDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '@app/shared';
import { ProxyService } from '../proxy.service';
import { appEnv } from '../app.env';

@ApiTags('auth')
@Controller('auth')
export class AuthProxyController {
  private readonly userServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.userServiceUrl = env.userServiceUrl;
  }

  @Post('register')
  @ApiOperation({ summary: 'register new account' })
  @ApiHeader({ name: 'accept-language', required: false })
  register(
    @Body() dto: RegisterDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AuthTokensDto> {
    return this.proxy.forward(
      this.userServiceUrl,
      'POST',
      '/auth/register',
      dto,
      undefined,
      { 'accept-language': acceptLanguage },
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'login' })
  @ApiHeader({ name: 'accept-language', required: false })
  login(
    @Body() dto: LoginDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AuthTokensDto> {
    return this.proxy.forward(
      this.userServiceUrl,
      'POST',
      '/auth/login',
      dto,
      undefined,
      { 'accept-language': acceptLanguage },
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'refresh access token' })
  @ApiHeader({ name: 'accept-language', required: false })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AuthTokensDto> {
    return this.proxy.forward(
      this.userServiceUrl,
      'POST',
      '/auth/refresh',
      dto,
      undefined,
      { 'accept-language': acceptLanguage },
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'revoke refresh token' })
  @ApiHeader({ name: 'accept-language', required: false })
  logout(
    @Body() dto: RefreshTokenDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<{ ok: true }> {
    return this.proxy.forward(
      this.userServiceUrl,
      'POST',
      '/auth/logout',
      dto,
      undefined,
      { 'accept-language': acceptLanguage },
    );
  }
}
