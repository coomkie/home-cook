import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateRecipeDraftDto,
  UpdateRecipeDraftDto,
} from '@app/shared';
import { CurrentUser, type RequestUser } from '../auth/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  listPublished(@Query('q') q?: string) {
    return this.recipes.searchPublished(q);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: RequestUser) {
    return this.recipes.listMine(user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRecipeDraftDto,
  ) {
    return this.recipes.createDraft(user.userId, dto);
  }

  @Get(':id/editor')
  @UseGuards(JwtAuthGuard)
  editor(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.recipes.getEditor(id, user.userId);
  }

  @Patch(':id/draft')
  @UseGuards(JwtAuthGuard)
  updateDraft(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDraftDto,
  ) {
    return this.recipes.updateDraft(id, user.userId, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.recipes.publish(id, user.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  deleteDraft(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.recipes.deleteDraft(id, user.userId);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.recipes.getPreview(id);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.recipes.getPublicDetail(id);
  }
}
