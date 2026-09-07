import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import {
  CurrentUser,
  Roles,
  type RequestUser,
} from '../auth/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { IngredientsService } from './ingredients.service';

class ProposeIngredientDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsUUID()
  imageAssetId?: string;
}

@Controller()
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get('units')
  listUnits() {
    return this.ingredients.listUnits();
  }

  @Get('ingredients')
  search(
    @Query('q') q?: string,
    @Query('status') status?: 'APPROVED' | 'PENDING',
  ) {
    return this.ingredients.search(q, status === 'PENDING' ? 'PENDING' : 'APPROVED');
  }

  @Get('ingredients/staples')
  listStaples() {
    return this.ingredients.listStaples();
  }

  @Post('ingredients')
  @UseGuards(JwtAuthGuard)
  propose(@CurrentUser() user: RequestUser, @Body() dto: ProposeIngredientDto) {
    return this.ingredients.propose(user.userId, dto);
  }

  @Get('ingredients/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  moderationQueue() {
    return this.ingredients.listPending();
  }

  @Post('ingredients/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ingredients.approve(id, user.userId);
  }

  @Post('ingredients/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  reject(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ingredients.reject(id, user.userId);
  }
}
