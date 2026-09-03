import { Body, Controller, Post } from '@nestjs/common';
import {
  AuthTokensDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '@app/shared';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto): Promise<{ ok: true }> {
    return this.authService.logout(dto.refreshToken);
  }
}
