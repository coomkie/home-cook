import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { UserClientService } from './user-client.service';
import { RecipeEntity } from './recipe.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecipeEntity]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  controllers: [RecipesController],
  providers: [RecipesService, UserClientService],
})
export class RecipesModule {}
