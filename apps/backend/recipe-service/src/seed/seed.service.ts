import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from '../media/media.service';
import { IngredientEntity } from '../ingredients/ingredient.entity';
import { UnitEntity } from '../ingredients/unit.entity';

const UNITS: Array<{
  code: string;
  name: string;
  symbol: string;
  unitType: UnitEntity['unitType'];
  allowsDecimal: boolean;
}> = [
  { code: 'g', name: 'Gram', symbol: 'g', unitType: 'MASS', allowsDecimal: true },
  { code: 'kg', name: 'Kilogram', symbol: 'kg', unitType: 'MASS', allowsDecimal: true },
  { code: 'ml', name: 'Milliliter', symbol: 'ml', unitType: 'VOLUME', allowsDecimal: true },
  { code: 'l', name: 'Liter', symbol: 'l', unitType: 'VOLUME', allowsDecimal: true },
  { code: 'tsp', name: 'Teaspoon', symbol: 'tsp', unitType: 'SPOON', allowsDecimal: true },
  { code: 'tbsp', name: 'Tablespoon', symbol: 'tbsp', unitType: 'SPOON', allowsDecimal: true },
  { code: 'cup', name: 'Cup', symbol: 'cup', unitType: 'VOLUME', allowsDecimal: true },
  { code: 'piece', name: 'Piece', symbol: 'pc', unitType: 'COUNT', allowsDecimal: false },
  { code: 'pinch', name: 'Pinch', symbol: 'pinch', unitType: 'CUSTOM', allowsDecimal: false },
  { code: 'clove', name: 'Clove', symbol: 'clove', unitType: 'COUNT', allowsDecimal: false },
];

const INGREDIENTS: Array<{ vi: string; en: string; slug: string }> = [
  { vi: 'Cà chua', en: 'Tomato', slug: 'tomato' },
  { vi: 'Hành tây', en: 'Onion', slug: 'onion' },
  { vi: 'Tỏi', en: 'Garlic', slug: 'garlic' },
  { vi: 'Gừng', en: 'Ginger', slug: 'ginger' },
  { vi: 'Ớt', en: 'Chili', slug: 'chili' },
  { vi: 'Muối', en: 'Salt', slug: 'salt' },
  { vi: 'Đường', en: 'Sugar', slug: 'sugar' },
  { vi: 'Tiêu', en: 'Pepper', slug: 'pepper' },
  { vi: 'Nước mắm', en: 'Fish sauce', slug: 'fish-sauce' },
  { vi: 'Dầu ăn', en: 'Cooking oil', slug: 'cooking-oil' },
  { vi: 'Trứng gà', en: 'Egg', slug: 'egg' },
  { vi: 'Thịt heo', en: 'Pork', slug: 'pork' },
  { vi: 'Thịt bò', en: 'Beef', slug: 'beef' },
  { vi: 'Gà', en: 'Chicken', slug: 'chicken' },
  { vi: 'Tôm', en: 'Shrimp', slug: 'shrimp' },
  { vi: 'Gạo', en: 'Rice', slug: 'rice' },
  { vi: 'Bột mì', en: 'Flour', slug: 'flour' },
  { vi: 'Sữa', en: 'Milk', slug: 'milk' },
  { vi: 'Bơ', en: 'Butter', slug: 'butter' },
  { vi: 'Phô mai', en: 'Cheese', slug: 'cheese' },
  { vi: 'Nấm', en: 'Mushroom', slug: 'mushroom' },
  { vi: 'Cà rốt', en: 'Carrot', slug: 'carrot' },
  { vi: 'Khoai tây', en: 'Potato', slug: 'potato' },
  { vi: 'Rau thơm', en: 'Herbs', slug: 'herbs' },
  { vi: 'Nước cốt chanh', en: 'Lime juice', slug: 'lime-juice' },
  { vi: 'Nước dừa', en: 'Coconut water', slug: 'coconut-water' },
  { vi: 'Đậu phụ', en: 'Tofu', slug: 'tofu' },
  { vi: 'Mì', en: 'Noodles', slug: 'noodles' },
  { vi: 'Bánh phở', en: 'Pho noodles', slug: 'pho-noodles' },
  { vi: 'Hành lá', en: 'Scallion', slug: 'scallion' },
];

const SEED_OWNER = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(UnitEntity)
    private readonly unitsRepo: Repository<UnitEntity>,
    @InjectRepository(IngredientEntity)
    private readonly ingredientsRepo: Repository<IngredientEntity>,
    private readonly media: MediaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedUnits();
    await this.seedIngredients();
  }

  private async seedUnits() {
    for (const u of UNITS) {
      const exists = await this.unitsRepo.exist({ where: { code: u.code } });
      if (exists) continue;
      await this.unitsRepo.save(this.unitsRepo.create(u));
    }
    this.logger.log(`Units seeded (${UNITS.length})`);
  }

  private async seedIngredients() {
    for (const item of INGREDIENTS) {
      const exists = await this.ingredientsRepo.exist({
        where: { slug: item.slug },
      });
      if (exists) continue;

      let imageAssetId: string | null = null;
      try {
        imageAssetId = await this.media.seedPlaceholderImage(
          SEED_OWNER,
          item.slug,
        );
      } catch (e) {
        this.logger.warn(
          `Skip image for ${item.slug}: ${e instanceof Error ? e.message : e}`,
        );
      }

      await this.ingredientsRepo.save(
        this.ingredientsRepo.create({
          canonicalName: item.vi,
          nameEn: item.en,
          slug: item.slug,
          imageAssetId,
          status: 'APPROVED',
          createdByUserId: SEED_OWNER,
          approvedByUserId: SEED_OWNER,
        }),
      );
    }
    this.logger.log(`Ingredients seeded (${INGREDIENTS.length})`);
  }
}
