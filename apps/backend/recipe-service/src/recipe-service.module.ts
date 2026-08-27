import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesModule } from './recipes/recipes.module';
import { RecipeEntity } from './recipes/recipe.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('RECIPE_DB_HOST', 'localhost'),
        port: Number(config.get('RECIPE_DB_PORT', 5432)),
        username: config.get<string>('RECIPE_DB_USER', 'recipes'),
        password: config.get<string>('RECIPE_DB_PASSWORD', 'recipes'),
        database: config.get<string>('RECIPE_DB_NAME', 'recipes_db'),
        entities: [RecipeEntity],
        synchronize: true, // học tập OK; prod dùng migration
      }),
    }),
    RecipesModule,
  ],
})
export class RecipeServiceModule {}
