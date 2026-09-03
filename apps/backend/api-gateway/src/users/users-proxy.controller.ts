import { Body, Controller, Get, Headers, Inject, Patch } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateProfileDto, UserMeResponseDto } from '@app/shared';
import { ProxyService } from '../proxy.service';
import { appEnv } from '../app.env';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersProxyController {
  private readonly userServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.userServiceUrl = env.userServiceUrl;
  }

  @Get('me')
  @ApiOperation({ summary: 'get current user profile' })
  @ApiHeader({ name: 'authorization', required: true })
  @ApiHeader({ name: 'accept-language', required: false })
  getMe(
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<UserMeResponseDto> {
    return this.proxy.forward(
      this.userServiceUrl,
      'GET',
      '/users/me',
      undefined,
      undefined,
      { authorization, 'accept-language': acceptLanguage },
    );
  }

  @Patch('me')
  @ApiOperation({ summary: 'update current user profile' })
  @ApiHeader({ name: 'authorization', required: true })
  @ApiHeader({ name: 'accept-language', required: false })
  updateMe(
    @Body() dto: UpdateProfileDto,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<UserMeResponseDto> {
    return this.proxy.forward(
      this.userServiceUrl,
      'PATCH',
      '/users/me',
      dto,
      undefined,
      { authorization, 'accept-language': acceptLanguage },
    );
  }
}
