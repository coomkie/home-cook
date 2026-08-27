import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRecipeDto, RecipeResponseDto } from '@app/shared';
import { ProxyService } from '../proxy.service';

@Controller('recipes')
export class RecipesProxyController {
  private readonly recipeServiceUrl =
    process.env.RECIPE_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly proxy: ProxyService) {}

  @Post()
  create(@Body() dto: CreateRecipeDto): Promise<RecipeResponseDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      '/recipes',
      dto,
    );
  }

  @Get()
  findAll(
    @Query('authorId') authorId?: string,
  ): Promise<RecipeResponseDto[]> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/recipes',
      undefined,
      { authorId },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RecipeResponseDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      `/recipes/${id}`,
    );
  }
}
