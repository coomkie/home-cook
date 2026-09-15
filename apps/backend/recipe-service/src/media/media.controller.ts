import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser, type RequestUser } from '../auth/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

class InitiateUploadDto {
  @IsString()
  @MinLength(3)
  mimeType: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  byteSize?: number;
}

class CompleteUploadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  publicId?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  secureUrl?: string;
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads/initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@CurrentUser() user: RequestUser, @Body() dto: InitiateUploadDto) {
    return this.media.initiate(user.userId, dto);
  }

  @Post('uploads/:id/complete')
  @UseGuards(JwtAuthGuard)
  complete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.media.complete(user.userId, id, dto);
  }

  @Get(':id/url')
  getUrl(@Param('id') id: string) {
    return this.media.getSignedGetUrl(id);
  }
}
