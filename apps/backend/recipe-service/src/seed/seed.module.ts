import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngredientEntity } from '../ingredients/ingredient.entity';
import { UnitEntity } from '../ingredients/unit.entity';
import { MediaModule } from '../media/media.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnitEntity, IngredientEntity]),
    MediaModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
