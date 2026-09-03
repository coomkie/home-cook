import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'lan@cook.dev' })
  @IsEmail({}, { message: 'validation.email' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: 'validation.string' })
  @MinLength(8, { message: 'validation.passwordMin' })
  password: string;
}
