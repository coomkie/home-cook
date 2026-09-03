import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token từ login/register' })
  @IsString({ message: 'validation.string' })
  @MinLength(20, { message: 'validation.refreshTokenRequired' })
  refreshToken: string;
}
