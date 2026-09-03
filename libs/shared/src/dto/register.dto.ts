import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'lan@cook.dev' })
  @IsEmail({}, { message: 'validation.email' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString({ message: 'validation.string' })
  @MinLength(8, { message: 'validation.passwordMin' })
  @MaxLength(72, { message: 'validation.passwordMax' })
  password: string;

  @ApiProperty({ example: 'Lan Nguyen' })
  @IsString({ message: 'validation.string' })
  @MinLength(2, { message: 'validation.displayNameMin' })
  @MaxLength(100, { message: 'validation.displayNameMax' })
  displayName: string;

  @ApiPropertyOptional({ example: 'Thích món Việt' })
  @IsOptional()
  @IsString({ message: 'validation.string' })
  @MaxLength(500, { message: 'validation.bioMax' })
  bio?: string;
}
