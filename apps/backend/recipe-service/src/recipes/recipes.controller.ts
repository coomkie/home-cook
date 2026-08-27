import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRecipeDto, RecipeResponseDto } from '@app/shared';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  create(@Body() dto: CreateRecipeDto): Promise<RecipeResponseDto> {
    return this.recipesService.create(dto);
  }

  @Get()
  findAll(
    @Query('authorId') authorId?: string,
  ): Promise<RecipeResponseDto[]> {
    if (authorId) {
      return this.recipesService.findByAuthor(authorId);
    }
    return this.recipesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RecipeResponseDto> {
    return this.recipesService.findOne(id);
  }
}
