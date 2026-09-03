import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Lan Nguyen' })
  @IsOptional()
  @IsString({ message: 'validation.string' })
  @MinLength(2, { message: 'validation.displayNameMin' })
  @MaxLength(100, { message: 'validation.displayNameMax' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'Updated bio' })
  @IsOptional()
  @IsString({ message: 'validation.string' })
  @MaxLength(500, { message: 'validation.bioMax' })
  bio?: string;
}
