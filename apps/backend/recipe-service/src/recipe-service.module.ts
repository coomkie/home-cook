import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { IngredientsModule } from './ingredients/ingredients.module';
import { IngredientEntity } from './ingredients/ingredient.entity';
import { UnitEntity } from './ingredients/unit.entity';
import { MediaModule } from './media/media.module';
import { MediaAssetEntity } from './media/media-asset.entity';
import { IngredientGroupEntity } from './recipes/ingredient-group.entity';
import { RecipeEntity } from './recipes/recipe.entity';
import { RecipeIngredientEntity } from './recipes/recipe-ingredient.entity';
import { RecipeStepEntity } from './recipes/recipe-step.entity';
import { RecipeVersionEntity } from './recipes/recipe-version.entity';
import { RecipesModule } from './recipes/recipes.module';
import { StepMediaEntity } from './recipes/step-media.entity';
import { SubRecipeReferenceEntity } from './recipes/sub-recipe-reference.entity';
import { ReviewsStubController } from './reviews/reviews-stub.controller';
import { SeedModule } from './seed/seed.module';
import { appEnv } from './app.env';

const entities = [
  MediaAssetEntity,
  UnitEntity,
  IngredientEntity,
  RecipeEntity,
  RecipeVersionEntity,
  IngredientGroupEntity,
  RecipeIngredientEntity,
  RecipeStepEntity,
  StepMediaEntity,
  SubRecipeReferenceEntity,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), '.env'],
      load: [appEnv],
    }),
    TypeOrmModule.forRootAsync({
      inject: [appEnv.KEY],
      useFactory: (env: ConfigType<typeof appEnv>) => ({
        type: 'postgres' as const,
        host: env.dbHost,
        port: env.dbPort,
        username: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        entities,
        synchronize: true,
      }),
    }),
    AuthModule,
    MediaModule,
    IngredientsModule,
    RecipesModule,
    SeedModule,
  ],
  controllers: [HealthController, ReviewsStubController],
})
export class RecipeServiceModule {}
