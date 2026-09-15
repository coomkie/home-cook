import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateRecipeDraftDto,
  RecipeDetailDto,
  RecipeEditorDto,
  RecipeListItemDto,
  RecipeVersionViewDto,
  UpdateRecipeDraftDto,
} from '@app/shared';import { MediaService } from '../media/media.service';
import { UserClientService } from './user-client.service';
import { RecipeEntity } from './recipe.entity';
import { RecipeVersionEntity } from './recipe-version.entity';
import { IngredientGroupEntity } from './ingredient-group.entity';
import { RecipeIngredientEntity } from './recipe-ingredient.entity';
import { RecipeStepEntity } from './recipe-step.entity';
import { StepMediaEntity } from './step-media.entity';
import { SubRecipeReferenceEntity } from './sub-recipe-reference.entity';
import { IngredientEntity } from '../ingredients/ingredient.entity';
import { UnitEntity } from '../ingredients/unit.entity';

function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return `${base || 'recipe'}-${Date.now().toString(36)}`;
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(RecipeEntity)
    private readonly recipesRepo: Repository<RecipeEntity>,
    @InjectRepository(RecipeVersionEntity)
    private readonly versionsRepo: Repository<RecipeVersionEntity>,
    @InjectRepository(IngredientGroupEntity)
    private readonly groupsRepo: Repository<IngredientGroupEntity>,
    @InjectRepository(RecipeIngredientEntity)
    private readonly linesRepo: Repository<RecipeIngredientEntity>,
    @InjectRepository(RecipeStepEntity)
    private readonly stepsRepo: Repository<RecipeStepEntity>,
    @InjectRepository(StepMediaEntity)
    private readonly stepMediaRepo: Repository<StepMediaEntity>,
    @InjectRepository(SubRecipeReferenceEntity)
    private readonly subRepo: Repository<SubRecipeReferenceEntity>,
    @InjectRepository(IngredientEntity)
    private readonly ingredientsRepo: Repository<IngredientEntity>,
    @InjectRepository(UnitEntity)
    private readonly unitsRepo: Repository<UnitEntity>,
    private readonly media: MediaService,
    private readonly userClient: UserClientService,
  ) {}

  async createDraft(
    userId: string,
    dto: CreateRecipeDraftDto,
  ): Promise<RecipeEditorDto> {
    await this.userClient.getUserById(userId);

    const recipe = await this.recipesRepo.save(
      this.recipesRepo.create({
        authorId: userId,
        slug: slugify(dto.title),
        status: 'DRAFT',
      }),
    );

    const version = await this.versionsRepo.save(
      this.versionsRepo.create({
        recipeId: recipe.id,
        versionNumber: 1,
        status: 'DRAFT',
        title: dto.title.trim(),
        summary: dto.summary?.trim() ?? '',
        servings: '2',
        prepTimeMinutes: 0,
        cookTimeMinutes: 30,
        difficulty: 'easy',
        createdByUserId: userId,
      }),
    );

    const defaultGroup = await this.groupsRepo.save(
      this.groupsRepo.create({
        recipeVersionId: version.id,
        name: 'Default',
        position: 1,
      }),
    );

    await this.stepsRepo.save(
      this.stepsRepo.create({
        recipeVersionId: version.id,
        position: 1,
        mode: 'TEXT',
        title: null,
        instruction: '',
        tip: null,
      }),
    );

    recipe.activeDraftVersionId = version.id;
    await this.recipesRepo.save(recipe);

    void defaultGroup;
    return this.getEditor(recipe.id, userId);
  }

  async listMine(userId: string): Promise<RecipeListItemDto[]> {
    const recipes = await this.recipesRepo.find({
      where: { authorId: userId },
      order: { updatedAt: 'DESC' },
    });
    return Promise.all(recipes.map((r) => this.toListItem(r)));
  }

  async listPublished(): Promise<RecipeListItemDto[]> {
    const recipes = await this.recipesRepo.find({
      where: { status: 'PUBLISHED' },
      order: { updatedAt: 'DESC' },
    });
    return Promise.all(recipes.map((r) => this.toListItem(r)));
  }

  async getPublicDetail(id: string): Promise<RecipeDetailDto> {
    const recipe = await this.recipesRepo.findOne({ where: { id } });
    if (!recipe || recipe.status !== 'PUBLISHED' || !recipe.currentPublishedVersionId) {
      throw new NotFoundException({
        message: 'errors.recipeNotFound',
        args: { id },
      });
    }
    const version = await this.loadVersionGraph(recipe.currentPublishedVersionId);
    let authorName: string | undefined;
    try {
      authorName = (await this.userClient.getUserById(recipe.authorId)).name;
    } catch {
      /* ignore */
    }
    return {
      id: recipe.id,
      slug: recipe.slug,
      status: recipe.status,
      authorId: recipe.authorId,
      authorName,
      version: await this.toVersionView(version),
      createdAt: recipe.createdAt.toISOString(),
    };
  }

  async getPreview(id: string): Promise<RecipeDetailDto> {
    return this.getPublicDetail(id);
  }

  async getEditor(recipeId: string, userId: string): Promise<RecipeEditorDto> {
    const recipe = await this.requireOwned(recipeId, userId);
    const draft = await this.ensureEditableDraft(recipe, userId);
    return {
      id: recipe.id,
      slug: recipe.slug,
      status: recipe.status,
      authorId: recipe.authorId,
      draft: await this.toVersionView(draft),
    };
  }

  async updateDraft(
    recipeId: string,
    userId: string,
    dto: UpdateRecipeDraftDto,
  ): Promise<RecipeEditorDto> {
    const recipe = await this.requireOwned(recipeId, userId);
    const editable = await this.ensureEditableDraft(recipe, userId);
    const version = await this.versionsRepo.findOne({
      where: { id: editable.id },
    });
    if (!version || version.status !== 'DRAFT') {
      throw new BadRequestException('errors.noDraftVersion');
    }

    if (dto.title !== undefined) version.title = dto.title.trim();
    if (dto.summary !== undefined) version.summary = dto.summary.trim();
    if (dto.servings !== undefined) version.servings = String(dto.servings);
    if (dto.prepTimeMinutes !== undefined)
      version.prepTimeMinutes = dto.prepTimeMinutes;
    if (dto.cookTimeMinutes !== undefined)
      version.cookTimeMinutes = dto.cookTimeMinutes;
    if (dto.difficulty !== undefined) version.difficulty = dto.difficulty;
    if (dto.coverAssetId !== undefined) {
      if (dto.coverAssetId) {
        await this.media.requireReadyOwned(dto.coverAssetId, userId);
      }
      version.coverAssetId = dto.coverAssetId;
    }
    await this.versionsRepo.save(version);

    if (dto.ingredientGroups) {
      await this.replaceGroups(version.id, dto.ingredientGroups);
    }
    if (dto.steps) {
      await this.replaceSteps(version.id, userId, dto.steps);
    }

    return this.getEditor(recipeId, userId);
  }

  async deleteDraft(recipeId: string, userId: string): Promise<void> {
    const recipe = await this.requireOwned(recipeId, userId);
    if (recipe.status !== 'DRAFT') {
      throw new BadRequestException('errors.onlyDraftDeletable');
    }

    const versions = await this.versionsRepo.find({
      where: { recipeId: recipe.id },
    });
    const versionIds = versions.map((v) => v.id);

    if (versionIds.length) {
      const referenced = await this.subRepo
        .createQueryBuilder('ref')
        .where('ref.child_recipe_version_id IN (:...ids)', { ids: versionIds })
        .getCount();
      if (referenced > 0) {
        throw new BadRequestException('errors.draftReferenced');
      }
    }

    recipe.activeDraftVersionId = null;
    recipe.currentPublishedVersionId = null;
    await this.recipesRepo.save(recipe);

    const mediaIds = new Set<string>();
    for (const version of versions) {
      if (version.coverAssetId) mediaIds.add(version.coverAssetId);
      const steps = await this.stepsRepo.find({
        where: { recipeVersionId: version.id },
        relations: ['media'],
      });
      for (const s of steps) {
        for (const m of s.media ?? []) {
          if (m.mediaAssetId) mediaIds.add(m.mediaAssetId);
        }
      }
    }
    if (mediaIds.size) {
      await this.media.destroyMany([...mediaIds]);
    }

    for (const version of versions) {
      await this.clearVersionChildren(version.id);
    }
    if (versions.length) {
      await this.versionsRepo.remove(versions);
    }
    await this.recipesRepo.remove(recipe);
  }

  async publish(recipeId: string, userId: string): Promise<RecipeDetailDto> {
    const recipe = await this.requireOwned(recipeId, userId);
    if (!recipe.activeDraftVersionId) {
      throw new BadRequestException('errors.noDraftVersion');
    }
    const version = await this.loadVersionGraph(recipe.activeDraftVersionId);
    await this.assertPublishable(version);

    if (recipe.currentPublishedVersionId) {
      const prev = await this.versionsRepo.findOne({
        where: { id: recipe.currentPublishedVersionId },
      });
      if (prev) {
        prev.status = 'SUPERSEDED';
        await this.versionsRepo.save(prev);
      }
    }

    version.status = 'PUBLISHED';
    version.publishedAt = new Date();
    await this.versionsRepo.save(version);

    recipe.status = 'PUBLISHED';
    recipe.currentPublishedVersionId = version.id;
    // keep same draft as published for v1 simplicity; create new draft on next edit later
    await this.recipesRepo.save(recipe);

    return this.getPublicDetail(recipe.id);
  }

  async searchPublished(q?: string): Promise<RecipeListItemDto[]> {
    const all = await this.listPublished();
    if (!q?.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.summary.toLowerCase().includes(needle),
    );
  }

  private async requireOwned(id: string, userId: string): Promise<RecipeEntity> {
    const recipe = await this.recipesRepo.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException({
        message: 'errors.recipeNotFound',
        args: { id },
      });
    }
    if (recipe.authorId !== userId) {
      throw new ForbiddenException('errors.forbiddenRole');
    }
    return recipe;
  }

  /**
   * Ensure there is a mutable DRAFT version.
   * After publish, activeDraft often still points at the PUBLISHED version —
   * clone it into a new DRAFT so edits don't mutate the live public copy.
   */
  private async ensureEditableDraft(
    recipe: RecipeEntity,
    userId: string,
  ): Promise<RecipeVersionEntity> {
    if (recipe.activeDraftVersionId) {
      const current = await this.versionsRepo.findOne({
        where: { id: recipe.activeDraftVersionId },
      });
      if (current?.status === 'DRAFT') {
        return this.loadVersionGraph(current.id);
      }
    }

    const sourceId =
      recipe.currentPublishedVersionId ?? recipe.activeDraftVersionId;
    if (!sourceId) {
      throw new BadRequestException('errors.noDraftVersion');
    }

    const source = await this.loadVersionGraph(sourceId);
    const maxVersion = await this.versionsRepo
      .createQueryBuilder('v')
      .select('MAX(v.versionNumber)', 'max')
      .where('v.recipeId = :recipeId', { recipeId: recipe.id })
      .getRawOne<{ max: string | null }>();
    const nextNumber = Number(maxVersion?.max ?? source.versionNumber) + 1;

    const draft = await this.versionsRepo.save(
      this.versionsRepo.create({
        recipeId: recipe.id,
        versionNumber: nextNumber,
        status: 'DRAFT',
        title: source.title,
        summary: source.summary,
        coverAssetId: source.coverAssetId ?? null,
        servings: source.servings,
        prepTimeMinutes: source.prepTimeMinutes,
        cookTimeMinutes: source.cookTimeMinutes,
        difficulty: source.difficulty,
        createdByUserId: userId,
      }),
    );

    for (const g of source.ingredientGroups ?? []) {
      const group = await this.groupsRepo.save(
        this.groupsRepo.create({
          recipeVersionId: draft.id,
          name: g.name,
          position: g.position,
        }),
      );
      for (const line of g.ingredients ?? []) {
        await this.linesRepo.save(
          this.linesRepo.create({
            ingredientGroupId: group.id,
            ingredientId: line.ingredientId ?? null,
            customName: line.customName ?? null,
            quantityMin: line.quantityMin ?? null,
            quantityMax: line.quantityMax ?? null,
            unitId: line.unitId ?? null,
            unitText: line.unitText ?? null,
            preparationNote: line.preparationNote ?? null,
            isOptional: line.isOptional,
            position: line.position,
          }),
        );
      }
    }

    for (const step of source.steps ?? []) {
      const saved = await this.stepsRepo.save(
        this.stepsRepo.create({
          recipeVersionId: draft.id,
          position: step.position,
          mode: step.mode,
          title: step.title ?? null,
          instruction: step.instruction ?? null,
          tip: step.tip ?? null,
        }),
      );
      for (const m of step.media ?? []) {
        await this.stepMediaRepo.save(
          this.stepMediaRepo.create({
            recipeStepId: saved.id,
            mediaAssetId: m.mediaAssetId,
            position: m.position,
            caption: m.caption ?? null,
          }),
        );
      }
      if (step.mode === 'SUB_RECIPE' && step.subRecipe) {
        await this.subRepo.save(
          this.subRepo.create({
            stepId: saved.id,
            childRecipeVersionId: step.subRecipe.childRecipeVersionId,
            servingMultiplier: step.subRecipe.servingMultiplier ?? '1',
          }),
        );
      }
    }

    recipe.activeDraftVersionId = draft.id;
    await this.recipesRepo.save(recipe);

    return this.loadVersionGraph(draft.id);
  }

  private async loadVersionGraph(versionId: string): Promise<RecipeVersionEntity> {
    const version = await this.versionsRepo.findOne({
      where: { id: versionId },
      relations: [
        'coverAsset',
        'ingredientGroups',
        'ingredientGroups.ingredients',
        'ingredientGroups.ingredients.ingredient',
        'ingredientGroups.ingredients.ingredient.imageAsset',
        'ingredientGroups.ingredients.unit',
        'steps',
        'steps.media',
        'steps.media.mediaAsset',
        'steps.subRecipe',
        'steps.subRecipe.childVersion',
        'steps.subRecipe.childVersion.coverAsset',
        'steps.subRecipe.childVersion.recipe',
      ],
    });
    if (!version) {
      throw new NotFoundException({
        message: 'errors.recipeNotFound',
        args: { id: versionId },
      });
    }
    version.ingredientGroups = (version.ingredientGroups ?? []).sort(
      (a, b) => a.position - b.position,
    );
    for (const g of version.ingredientGroups) {
      g.ingredients = (g.ingredients ?? []).sort((a, b) => a.position - b.position);
    }
    version.steps = (version.steps ?? []).sort((a, b) => a.position - b.position);
    for (const s of version.steps) {
      s.media = (s.media ?? []).sort((a, b) => a.position - b.position);
    }
    return version;
  }

  private async clearVersionChildren(versionId: string): Promise<void> {
    const groups = await this.groupsRepo.find({
      where: { recipeVersionId: versionId },
      relations: ['ingredients'],
    });
    for (const g of groups) {
      if (g.ingredients?.length) {
        await this.linesRepo.remove(g.ingredients);
      }
    }
    if (groups.length) await this.groupsRepo.remove(groups);

    const steps = await this.stepsRepo.find({
      where: { recipeVersionId: versionId },
      relations: ['media', 'subRecipe'],
    });
    for (const s of steps) {
      if (s.media?.length) await this.stepMediaRepo.remove(s.media);
      if (s.subRecipe) await this.subRepo.remove(s.subRecipe);
    }
    if (steps.length) await this.stepsRepo.remove(steps);
  }

  private async replaceGroups(
    versionId: string,
    groups: UpdateRecipeDraftDto['ingredientGroups'],
  ) {
    if (!groups) return;
    const existing = await this.groupsRepo.find({
      where: { recipeVersionId: versionId },
      relations: ['ingredients'],
    });
    for (const g of existing) {
      if (g.ingredients?.length) {
        await this.linesRepo.remove(g.ingredients);
      }
    }
    if (existing.length) await this.groupsRepo.remove(existing);

    let gPos = 1;
    for (const g of groups) {
      const group = await this.groupsRepo.save(
        this.groupsRepo.create({
          recipeVersionId: versionId,
          name: g.name.trim() || 'Default',
          position: gPos++,
        }),
      );
      let iPos = 1;
      for (const line of g.ingredients) {
        if (!line.ingredientId && !line.customName?.trim()) {
          throw new BadRequestException('validation.ingredientsMin');
        }
        if (line.ingredientId) {
          const ing = await this.ingredientsRepo.findOne({
            where: { id: line.ingredientId, status: 'APPROVED' },
          });
          if (!ing) throw new BadRequestException('errors.ingredientNotFound');
        }
        if (line.unitId) {
          const unit = await this.unitsRepo.findOne({ where: { id: line.unitId } });
          if (!unit) throw new BadRequestException('errors.unitNotFound');
        }
        await this.linesRepo.save(
          this.linesRepo.create({
            ingredientGroupId: group.id,
            ingredientId: line.ingredientId ?? null,
            customName: line.ingredientId
              ? null
              : line.customName?.trim() ?? null,
            quantityMin:
              line.quantityMin !== undefined && line.quantityMin !== null
                ? String(line.quantityMin)
                : null,
            quantityMax:
              line.quantityMax !== undefined && line.quantityMax !== null
                ? String(line.quantityMax)
                : null,
            unitId: line.unitId ?? null,
            unitText: line.unitText?.trim() || null,
            preparationNote: line.preparationNote?.trim() ?? null,
            isOptional: line.isOptional ?? false,
            position: iPos++,
          }),
        );
      }
    }
  }

  private async replaceSteps(
    versionId: string,
    userId: string,
    steps: NonNullable<UpdateRecipeDraftDto['steps']>,
  ) {
    const existing = await this.stepsRepo.find({
      where: { recipeVersionId: versionId },
      relations: ['media', 'subRecipe'],
    });
    for (const s of existing) {
      if (s.media?.length) await this.stepMediaRepo.remove(s.media);
      if (s.subRecipe) await this.subRepo.remove(s.subRecipe);
    }
    if (existing.length) await this.stepsRepo.remove(existing);

    const parentRecipe = await this.versionsRepo.findOne({
      where: { id: versionId },
    });
    if (!parentRecipe) throw new BadRequestException('errors.noDraftVersion');

    let pos = 1;
    for (const step of steps) {
      if (step.mode === 'TEXT' && !step.instruction?.trim()) {
        throw new BadRequestException('validation.stepsMin');
      }
      if (step.mode === 'SUB_RECIPE') {
        if (!step.childRecipeVersionId) {
          throw new BadRequestException('errors.subRecipeRequired');
        }
        await this.assertAcyclic(
          parentRecipe.recipeId,
          step.childRecipeVersionId,
        );
        const child = await this.versionsRepo.findOne({
          where: { id: step.childRecipeVersionId, status: 'PUBLISHED' },
          relations: ['recipe'],
        });
        if (!child || child.recipe?.status !== 'PUBLISHED') {
          throw new BadRequestException('errors.subRecipeNotPublished');
        }
      }

      const saved = await this.stepsRepo.save(
        this.stepsRepo.create({
          recipeVersionId: versionId,
          position: pos++,
          mode: step.mode,
          title: step.title?.trim() ?? null,
          instruction:
            step.mode === 'TEXT' ? step.instruction?.trim() ?? '' : null,
          tip: step.tip?.trim() ?? null,
        }),
      );

      if (step.mode === 'TEXT' && step.media?.length) {
        let mPos = 1;
        for (const m of step.media) {
          await this.media.requireReadyOwned(m.mediaAssetId, userId);
          await this.stepMediaRepo.save(
            this.stepMediaRepo.create({
              recipeStepId: saved.id,
              mediaAssetId: m.mediaAssetId,
              position: mPos++,
              caption: m.caption?.trim() ?? null,
            }),
          );
        }
      }

      if (step.mode === 'SUB_RECIPE' && step.childRecipeVersionId) {
        await this.subRepo.save(
          this.subRepo.create({
            stepId: saved.id,
            childRecipeVersionId: step.childRecipeVersionId,
            servingMultiplier: String(step.servingMultiplier ?? 1),
          }),
        );
      }
    }
  }

  private async assertAcyclic(
    parentRecipeId: string,
    childVersionId: string,
  ): Promise<void> {
    const childVersion = await this.versionsRepo.findOne({
      where: { id: childVersionId },
    });
    if (!childVersion) {
      throw new BadRequestException('errors.subRecipeNotPublished');
    }
    if (childVersion.recipeId === parentRecipeId) {
      throw new BadRequestException('errors.subRecipeCycle');
    }

    const visited = new Set<string>([parentRecipeId]);
    const queue = [childVersion.recipeId];
    while (queue.length) {
      const rid = queue.shift()!;
      if (visited.has(rid)) {
        throw new BadRequestException('errors.subRecipeCycle');
      }
      visited.add(rid);
      const recipe = await this.recipesRepo.findOne({ where: { id: rid } });
      if (!recipe?.currentPublishedVersionId) continue;
      const steps = await this.stepsRepo.find({
        where: {
          recipeVersionId: recipe.currentPublishedVersionId,
          mode: 'SUB_RECIPE',
        },
        relations: ['subRecipe', 'subRecipe.childVersion'],
      });
      for (const s of steps) {
        const childRid = s.subRecipe?.childVersion?.recipeId;
        if (childRid) queue.push(childRid);
      }
    }
  }

  private async assertPublishable(version: RecipeVersionEntity) {
    const lines = (version.ingredientGroups ?? []).flatMap(
      (g) => g.ingredients ?? [],
    );
    if (lines.length < 1) {
      throw new BadRequestException('validation.ingredientsMin');
    }
    const steps = version.steps ?? [];
    if (steps.length < 1) {
      throw new BadRequestException('validation.stepsMin');
    }
    for (const s of steps) {
      if (s.mode === 'TEXT' && !s.instruction?.trim()) {
        throw new BadRequestException('validation.stepsMin');
      }
      if (s.mode === 'SUB_RECIPE') {
        if (!s.subRecipe?.childRecipeVersionId) {
          throw new BadRequestException('errors.subRecipeRequired');
        }
        await this.assertAcyclic(
          version.recipeId,
          s.subRecipe.childRecipeVersionId,
        );
      }
      for (const m of s.media ?? []) {
        const asset = await this.media.findReady(m.mediaAssetId);
        if (!asset) throw new BadRequestException('errors.mediaNotReady');
      }
    }
    if (version.coverAssetId) {
      const cover = await this.media.findReady(version.coverAssetId);
      if (!cover) throw new BadRequestException('errors.mediaNotReady');
    }
    if (!version.title?.trim()) {
      throw new BadRequestException('validation.titleMin');
    }
  }

  private async toListItem(recipe: RecipeEntity): Promise<RecipeListItemDto> {
    const versionId =
      recipe.currentPublishedVersionId ?? recipe.activeDraftVersionId;
    let title = recipe.slug;
    let summary = '';
    let cookTimeMinutes = 0;
    let difficulty = 'easy';
    let coverUrl: string | undefined;
    if (versionId) {
      const v = await this.versionsRepo.findOne({ where: { id: versionId } });
      if (v) {
        title = v.title;
        summary = v.summary;
        cookTimeMinutes = v.cookTimeMinutes;
        difficulty = v.difficulty;
        if (v.coverAssetId) {
          try {
            coverUrl = (await this.media.getSignedGetUrl(v.coverAssetId)).url;
          } catch {
            /* ignore */
          }
        }
      }
    }
    let authorName: string | undefined;
    try {
      authorName = (await this.userClient.getUserById(recipe.authorId)).name;
    } catch {
      /* ignore */
    }
    return {
      id: recipe.id,
      slug: recipe.slug,
      status: recipe.status,
      title,
      summary,
      coverUrl,
      authorId: recipe.authorId,
      authorName,
      cookTimeMinutes,
      difficulty,
      createdAt: recipe.createdAt.toISOString(),
    };
  }

  private async toVersionView(
    version: RecipeVersionEntity,
  ): Promise<RecipeVersionViewDto> {
    let coverUrl: string | undefined;
    if (version.coverAsset) {
      coverUrl = this.media.deliveryUrlFor(version.coverAsset);
    } else if (version.coverAssetId) {
      try {
        coverUrl = (await this.media.getSignedGetUrl(version.coverAssetId)).url;
      } catch {
        /* ignore */
      }
    }

    const ingredientGroups = await Promise.all(
      (version.ingredientGroups ?? []).map(async (g) => ({
        id: g.id,
        name: g.name,
        position: g.position,
        ingredients: await Promise.all(
          (g.ingredients ?? []).map(async (line) => {
            let imageUrl: string | undefined;
            const name =
              line.ingredient?.canonicalName ?? line.customName ?? '';
            if (line.ingredient?.imageAssetId) {
              try {
                imageUrl = (
                  await this.media.getSignedGetUrl(line.ingredient.imageAssetId)
                ).url;
              } catch {
                /* ignore */
              }
            }
            return {
              id: line.id,
              ingredientId: line.ingredientId ?? undefined,
              customName: line.customName ?? undefined,
              name,
              imageUrl,
              quantityMin: line.quantityMin != null ? Number(line.quantityMin) : undefined,
              quantityMax: line.quantityMax != null ? Number(line.quantityMax) : undefined,
              unitText:
                line.unitText?.trim() ||
                line.unit?.symbol ||
                undefined,
              unit: line.unit
                ? {
                    id: line.unit.id,
                    code: line.unit.code,
                    name: line.unit.name,
                    symbol: line.unit.symbol,
                    unitType: line.unit.unitType,
                    allowsDecimal: line.unit.allowsDecimal,
                  }
                : undefined,
              preparationNote: line.preparationNote ?? undefined,
              isOptional: line.isOptional,
              position: line.position,
            };
          }),
        ),
      })),
    );

    const steps = await Promise.all(
      (version.steps ?? []).map(async (s) => {
        const media = (s.media ?? []).map((m) => ({
          id: m.id,
          mediaAssetId: m.mediaAssetId,
          url:
            (m.mediaAsset && this.media.deliveryUrlFor(m.mediaAsset)) ||
            undefined,
          mediaType: m.mediaAsset?.mediaType,
          caption: m.caption ?? undefined,
          position: m.position,
        }));

        for (const item of media) {
          if (item.url) continue;
          try {
            item.url = (await this.media.getSignedGetUrl(item.mediaAssetId)).url;
          } catch {
            /* asset missing / legacy key */
          }
        }

        let subRecipe;
        if (s.mode === 'SUB_RECIPE' && s.subRecipe?.childVersion) {
          const cv = s.subRecipe.childVersion;
          let childCover: string | undefined;
          if (cv.coverAssetId) {
            try {
              childCover = (await this.media.getSignedGetUrl(cv.coverAssetId))
                .url;
            } catch {
              /* ignore */
            }
          }
          let authorName: string | undefined;
          try {
            authorName = (
              await this.userClient.getUserById(cv.recipe.authorId)
            ).name;
          } catch {
            /* ignore */
          }
          subRecipe = {
            recipeId: cv.recipeId,
            versionId: cv.id,
            title: cv.title,
            summary: cv.summary,
            coverUrl: childCover,
            authorName,
            cookTimeMinutes: cv.cookTimeMinutes,
            difficulty: cv.difficulty,
            servingMultiplier: Number(s.subRecipe.servingMultiplier),
          };
        }

        return {
          id: s.id,
          position: s.position,
          mode: s.mode,
          title: s.title ?? undefined,
          instruction: s.instruction ?? undefined,
          tip: s.tip ?? undefined,
          media,
          subRecipe,
        };
      }),
    );

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      title: version.title,
      summary: version.summary,
      coverAssetId: version.coverAssetId ?? undefined,
      coverUrl,
      servings: Number(version.servings),
      prepTimeMinutes: version.prepTimeMinutes,
      cookTimeMinutes: version.cookTimeMinutes,
      difficulty: version.difficulty,
      ingredientGroups,
      steps,
      publishedAt: version.publishedAt?.toISOString(),
    };
  }
}
