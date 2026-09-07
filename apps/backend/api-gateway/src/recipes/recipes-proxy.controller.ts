import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import {
  CreateRecipeDraftDto,
  RecipeDetailDto,
  RecipeEditorDto,
  RecipeListItemDto,
  UpdateRecipeDraftDto,
} from '@app/shared';
import { ProxyService } from '../proxy.service';
import { appEnv } from '../app.env';

@Controller('recipes')
export class RecipesProxyController {
  private readonly recipeServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.recipeServiceUrl = env.recipeServiceUrl;
  }

  private fwd(
    authorization?: string,
    acceptLanguage?: string,
  ): Record<string, string | undefined> {
    return { authorization, 'accept-language': acceptLanguage };
  }

  @Get()
  list(
    @Query('q') q?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeListItemDto[]> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/recipes',
      undefined,
      { q },
      this.fwd(undefined, acceptLanguage),
    );
  }

  @Get('mine')
  mine(
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeListItemDto[]> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      '/recipes/mine',
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Post()
  create(
    @Body() dto: CreateRecipeDraftDto,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeEditorDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      '/recipes',
      dto,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Get(':id/editor')
  editor(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeEditorDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      `/recipes/${id}/editor`,
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Patch(':id/draft')
  updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDraftDto,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeEditorDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'PATCH',
      `/recipes/${id}/draft`,
      dto,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeDetailDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'POST',
      `/recipes/${id}/publish`,
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  deleteDraft(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'DELETE',
      `/recipes/${id}`,
      undefined,
      undefined,
      this.fwd(authorization, acceptLanguage),
    );
  }

  @Get(':id/preview')
  preview(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeDetailDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      `/recipes/${id}/preview`,
      undefined,
      undefined,
      this.fwd(undefined, acceptLanguage),
    );
  }

  @Get(':id')
  detail(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RecipeDetailDto> {
    return this.proxy.forward(
      this.recipeServiceUrl,
      'GET',
      `/recipes/${id}`,
      undefined,
      undefined,
      this.fwd(undefined, acceptLanguage),
    );
  }
}
