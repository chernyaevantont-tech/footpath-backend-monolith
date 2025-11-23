import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PlaceEmbedding } from './entities/place-embedding.entity';
import { Place } from '../places/entities/place.entity';
import { PlaceStatus } from '../places/entities/place.entity';
import { User } from '../auth/entities/user.entity';
import { Walk } from '../walks/entities/walk.entity';
import { WalkParticipant } from '../walks/entities/walk-participant.entity';
import { WalkStatus } from '../walks/entities/walk.entity';
import { Path } from '../paths/entities/path.entity';
import { PathPlace } from '../paths/entities/path-place.entity';
import { GetPlaceRecommendationsDto, GetPathRecommendationsDto, GenerateEmbeddingDto } from './dto/recommendation.dto';
import { VectorTransformer } from './utils/vector-transformer';
import { PlacesService } from '../places/places.service';

// Mock embedding generation - in production, this would call an actual embedding API
export class MockEmbeddingGenerator {
  static generateEmbedding(text: string): number[] {
    // In a real implementation, this would call an AI service to generate embeddings
    // For this demo, we'll create a deterministic pseudo-embedding based on the text

    // Create a simple hash-based embedding for demonstration purposes
    const embedding: number[] = new Array(1536).fill(0);

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % embedding.length] = (embedding[i % embedding.length] + charCode) % 2;
    }

    // Normalize the embedding to have mean ~0 and std ~1
    const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
    const std = Math.sqrt(embedding.reduce((sum, val) => Math.pow(val - mean, 2), 0) / embedding.length);

    return embedding.map(val => (val - mean) / (std + 1e-8));
  }
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(PlaceEmbedding)
    private placeEmbeddingRepository: Repository<PlaceEmbedding>,
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Walk)
    private walkRepository: Repository<Walk>,
    @InjectRepository(WalkParticipant)
    private walkParticipantRepository: Repository<WalkParticipant>,
    @Inject(forwardRef(() => PlacesService))
    private placesService: PlacesService,
    private dataSource: DataSource,
  ) {}

  /**
   * Generate embedding for a place based on its name, description and tags
   */
  async generateEmbedding(generateEmbeddingDto: GenerateEmbeddingDto): Promise<PlaceEmbedding> {
    this.logger.log(`Generating embedding for place ID: ${generateEmbeddingDto.placeId}`);

    const { placeId, name, description, tags } = generateEmbeddingDto;
    
    // Combine all text data to create the embedding
    const textForEmbedding = `${name} ${description} ${tags.join(' ')}`.trim();
    
    // Generate the embedding (in real app, this would call an AI API)
    const embedding = MockEmbeddingGenerator.generateEmbedding(textForEmbedding);

    // Check if embedding already exists
    let placeEmbedding = await this.placeEmbeddingRepository.findOne({
      where: { placeId },
    });

    if (placeEmbedding) {
      // Update existing embedding
      placeEmbedding.embedding = embedding;
      placeEmbedding.updatedAt = new Date();
      placeEmbedding = await this.placeEmbeddingRepository.save(placeEmbedding);
      this.logger.log(`Updated embedding for place ID: ${placeId}`);
    } else {
      // Create new embedding
      placeEmbedding = new PlaceEmbedding();
      placeEmbedding.placeId = placeId;
      placeEmbedding.embedding = embedding;
      placeEmbedding = await this.placeEmbeddingRepository.save(placeEmbedding);
      this.logger.log(`Created new embedding for place ID: ${placeId}`);
    }

    return placeEmbedding;
  }

  /**
   * Get recommended places for a user based on their preferences
   */
  async getRecommendedPlaces(userId: string, dto: GetPlaceRecommendationsDto): Promise<Place[]> {
    this.logger.log(`Getting place recommendations for user: ${userId}, limit: ${dto.limit}`);
    
    const limit = dto.limit || 10;

    // Get user's visited places from completed walks
    const visitedPlaceIds = await this.getUserVisitedPlaceIds(userId);

    // If user has visited places, use collaborative filtering approach
    if (visitedPlaceIds.length > 0) {
      // Get embeddings for visited places
      const visitedPlaceEmbeddings = await this.placeEmbeddingRepository.find({
        where: { placeId: In(visitedPlaceIds) },
      });

      if (visitedPlaceEmbeddings.length > 0) {
        // Use vector similarity to find similar places
        return await this.getSimilarPlacesByEmbedding(visitedPlaceEmbeddings, userId, limit, dto.tags);
      }
    }

    // Fallback: Get popular places or places with specific tags
    return await this.getPopularOrTaggedPlaces(userId, limit, dto.tags);
  }

  /**
   * Get places similar to the provided embeddings
   */
  private async getSimilarPlacesByEmbedding(
    embeddings: PlaceEmbedding[],
    userId: string,
    limit: number,
    tags?: string[],
  ): Promise<Place[]> {
    this.logger.log(`Finding similar places using vector similarity`);
    
    // For this implementation, we'll use a simplified approach
    // In a real implementation, we'd use pgvector's similarity functions like cosine distance
    
    // Get all approved places with embeddings
    let query = this.placeRepository
      .createQueryBuilder('place')
      .innerJoin(PlaceEmbedding, 'embedding', 'embedding.placeId = place.id')
      .where('place.status = :status', { status: PlaceStatus.APPROVED })
      .andWhere('place.id NOT IN (:...visitedPlaceIds)', { visitedPlaceIds: await this.getUserVisitedPlaceIds(userId) })
      .limit(limit);

    if (tags && tags.length > 0) {
      query = query.andWhere('place.tagIds && (:tags)', { tags });
    }

    const similarPlaces = await query.getMany();
    this.logger.log(`Found ${similarPlaces.length} similar places using vector similarity`);

    return similarPlaces;
  }

  /**
   * Get popular or tagged places as fallback
   */
  private async getPopularOrTaggedPlaces(userId: string, limit: number, tags?: string[]): Promise<Place[]> {
    this.logger.log(`Getting popular or tagged places as fallback`);
    
    const visitedPlaceIds = await this.getUserVisitedPlaceIds(userId);

    let query = this.placeRepository.createQueryBuilder('place')
      .where('place.status = :status', { status: PlaceStatus.APPROVED })
      .limit(limit);

    if (visitedPlaceIds.length > 0) {
      query = query.andWhere('place.id NOT IN (:...visitedPlaceIds)', { visitedPlaceIds });
    }

    if (tags && tags.length > 0) {
      query = query.andWhere('place.tagIds && (:tags)', { tags });
    }

    query = query.orderBy('place.createdAt', 'DESC'); // Simple popularity heuristic

    const places = await query.getMany();
    this.logger.log(`Found ${places.length} popular/tagged places as fallback`);

    return places;
  }

  /**
   * Get recommended paths for a user
   */
  async getRecommendedPaths(userId: string, dto: GetPathRecommendationsDto): Promise<any[]> { // Placeholder for path recommendations
    this.logger.log(`Getting path recommendations for user: ${userId}, limit: ${dto.limit}`);
    
    // This is a placeholder implementation - in a real app, this would:
    // 1. Use user's preferences and history
    // 2. Find routes between locations user might want to go
    // 3. Use visited places to suggest new routes
    
    // For now, return empty array as the path recommendation algorithm is complex
    // and would require full path implementation
    return [];
  }

  /**
   * Get places visited by user through completed walks
   */
  private async getUserVisitedPlaceIds(userId: string): Promise<string[]> {
    // Find all walks where user participated and the walk was completed
    const completedWalkParticipantEntities = await this.walkParticipantRepository
      .createQueryBuilder('wp')
      .innerJoin(Walk, 'walk', 'wp.walkId = walk.id')
      .innerJoin(Path, 'path', 'walk.pathId = path.id')
      .innerJoin(PathPlace, 'pp', 'pp.pathId = path.id')
      .where('wp.userId = :userId', { userId })
      .andWhere('walk.status = :status', { status: WalkStatus.COMPLETED })
      .select('pp.placeId')
      .getRawMany();

    const placeIds = completedWalkParticipantEntities.map(item => item.placeId);
    this.logger.log(`Found ${placeIds.length} visited places for user: ${userId}`);

    return placeIds;
  }

  /**
   * Generate embeddings for all approved places that don't have embeddings yet
   */
  async generateEmbeddingsForAllPlaces(): Promise<number> {
    this.logger.log('Generating embeddings for all places without embeddings');

    // Get all approved places without embeddings
    const placesWithoutEmbeddings = await this.dataSource
      .createQueryBuilder()
      .select('p.id, p.name, p.description, p.tagIds')
      .from(Place, 'p')
      .leftJoin(PlaceEmbedding, 'pe', 'pe.placeId = p.id')
      .where('p.status = :status', { status: PlaceStatus.APPROVED })
      .andWhere('pe.placeId IS NULL')
      .getRawMany();

    let processedCount = 0;
    for (const place of placesWithoutEmbeddings) {
      try {
        const generateEmbeddingDto: GenerateEmbeddingDto = {
          placeId: place.id,
          name: place.name,
          description: place.description || '',
          tags: place.tagIds || [],
        };

        await this.generateEmbedding(generateEmbeddingDto);
        processedCount++;
      } catch (error) {
        this.logger.error(`Error generating embedding for place ${place.id}: ${error.message}`);
      }
    }

    this.logger.log(`Generated embeddings for ${processedCount} places`);

    return processedCount;
  }
}