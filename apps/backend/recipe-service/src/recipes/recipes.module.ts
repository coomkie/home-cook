import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { IngredientEntity } from '../ingredients/ingredient.entity';
import { UnitEntity } from '../ingredients/unit.entity';
import { IngredientGroupEntity } from './ingredient-group.entity';
import { RecipeEntity } from './recipe.entity';
import { RecipeIngredientEntity } from './recipe-ingredient.entity';
import { RecipeStepEntity } from './recipe-step.entity';
import { RecipeVersionEntity } from './recipe-version.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { StepMediaEntity } from './step-media.entity';
import { SubRecipeReferenceEntity } from './sub-recipe-reference.entity';
import { UserClientService } from './user-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecipeEntity,
      RecipeVersionEntity,
      IngredientGroupEntity,
      RecipeIngredientEntity,
      RecipeStepEntity,
      StepMediaEntity,
      SubRecipeReferenceEntity,
      IngredientEntity,
      UnitEntity,
    ]),
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    AuthModule,
    MediaModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService, UserClientService],
  exports: [RecipesService],
})
export class RecipesModule {}
