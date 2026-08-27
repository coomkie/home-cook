import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRecipeDto, RecipeResponseDto } from '@app/shared';
import { RecipeEntity } from './recipe.entity';
import { UserClientService } from './user-client.service';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(RecipeEntity)
    private readonly recipesRepo: Repository<RecipeEntity>,
    private readonly userClient: UserClientService,
  ) {}

  async create(dto: CreateRecipeDto): Promise<RecipeResponseDto> {
    // Cross-service call: kiểm tra author tồn tại trước khi lưu
    const author = await this.userClient.getUserById(dto.authorId);

    const recipe = this.recipesRepo.create({
      title: dto.title,
      description: dto.description,
      ingredients: dto.ingredients,
      steps: dto.steps,
      cookTimeMinutes: dto.cookTimeMinutes,
      difficulty: dto.difficulty,
      authorId: dto.authorId,
    });
    const saved = await this.recipesRepo.save(recipe);

    return {
      ...this.toResponse(saved),
      authorName: author.name,
    };
  }

  async findAll(): Promise<RecipeResponseDto[]> {
    const recipes = await this.recipesRepo.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(recipes.map((r) => this.enrich(r)));
  }

  async findOne(id: string): Promise<RecipeResponseDto> {
    const recipe = await this.recipesRepo.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return this.enrich(recipe);
  }

  async findByAuthor(authorId: string): Promise<RecipeResponseDto[]> {
    await this.userClient.getUserById(authorId);

    const recipes = await this.recipesRepo.find({
      where: { authorId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(recipes.map((r) => this.enrich(r)));
  }

  private async enrich(recipe: RecipeEntity): Promise<RecipeResponseDto> {
    const base = this.toResponse(recipe);
    try {
      const author = await this.userClient.getUserById(recipe.authorId);
      return { ...base, authorName: author.name };
    } catch {
      return { ...base, authorName: undefined };
    }
  }

  private toResponse(recipe: RecipeEntity): RecipeResponseDto {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      cookTimeMinutes: recipe.cookTimeMinutes,
      difficulty: recipe.difficulty,
      authorId: recipe.authorId,
      createdAt: recipe.createdAt.toISOString(),
    };
  }
}
