import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

const INGREDIENTS: Array<{
  vi: string;
  en: string;
  slug: string;
  staple?: boolean;
}> = [
  { vi: 'Cà chua', en: 'Tomato', slug: 'tomato' },
  { vi: 'Hành tây', en: 'Onion', slug: 'onion' },
  { vi: 'Tỏi', en: 'Garlic', slug: 'garlic' },
  { vi: 'Gừng', en: 'Ginger', slug: 'ginger' },
  { vi: 'Ớt', en: 'Chili', slug: 'chili' },
  { vi: 'Muối', en: 'Salt', slug: 'salt', staple: true },
  { vi: 'Đường', en: 'Sugar', slug: 'sugar', staple: true },
  { vi: 'Tiêu', en: 'Pepper', slug: 'pepper', staple: true },
  { vi: 'Nước mắm', en: 'Fish sauce', slug: 'fish-sauce', staple: true },
  { vi: 'Trứng gà', en: 'Egg', slug: 'egg' },
  { vi: 'Gạo', en: 'Rice', slug: 'rice' },
  { vi: 'Bột mì', en: 'Flour', slug: 'flour' },
  { vi: 'Sữa', en: 'Milk', slug: 'milk' },
  { vi: 'Bơ', en: 'Butter', slug: 'butter' },
  { vi: 'Phô mai', en: 'Cheese', slug: 'cheese' },
  { vi: 'Cà rốt', en: 'Carrot', slug: 'carrot' },
  { vi: 'Khoai tây', en: 'Potato', slug: 'potato' },
  { vi: 'Rau thơm', en: 'Herbs', slug: 'herbs' },
  { vi: 'Đậu phụ', en: 'Tofu', slug: 'tofu' },
  { vi: 'Thịt thăn heo', en: 'Pork Tenderloin', slug: 'pork-tenderloin' },
  { vi: 'Bột chiên xù', en: 'Breadcrumbs', slug: 'breadcrumbs' },
  { vi: 'Bột chiên giòn', en: 'Crispy Frying Flour', slug: 'crispy-frying-flour' },
  { vi: 'Vani', en: 'Vanilla', slug: 'vanilla' },
  { vi: 'Hành lá', en: 'Scallion', slug: 'scallion' },
  {
    vi: 'Xốt gia vị hoàn chỉnh cà ri Barona',
    en: 'Barona Curry Sauce',
    slug: 'barona-curry-sauce',
  },
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

      // Images left empty for now — attach real media later.
      await this.ingredientsRepo.save(
        this.ingredientsRepo.create({
          canonicalName: item.vi,
          nameEn: item.en,
          slug: item.slug,
          imageAssetId: null,
          status: 'APPROVED',
          isStaple: !!item.staple,
          createdByUserId: SEED_OWNER,
          approvedByUserId: SEED_OWNER,
        }),
      );
    }

    // Sync staple flags for existing rows (safe to re-run).
    const stapleSlugs = INGREDIENTS.filter((i) => i.staple).map((i) => i.slug);
    if (stapleSlugs.length) {
      await this.ingredientsRepo.update(
        { slug: In(stapleSlugs) },
        { isStaple: true },
      );
    }

    this.logger.log(
      `Ingredients seeded (${INGREDIENTS.length}, staples: ${stapleSlugs.length}, images: empty)`,
    );
  }
}
