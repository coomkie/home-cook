import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { IngredientEntity } from './ingredient.entity';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { UnitEntity } from './unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngredientEntity, UnitEntity]),
    AuthModule,
    MediaModule,
  ],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService, TypeOrmModule],
})
export class IngredientsModule {}
