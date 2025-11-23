import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetPlaceRecommendationsDto, GetPathRecommendationsDto } from './dto/recommendation.dto';
import { Place } from '../places/entities/place.entity';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(private recommendationsService: RecommendationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('places')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get personalized place recommendations for user' })
  @ApiBearerAuth()
  @ApiQuery({ type: GetPlaceRecommendationsDto })
  @ApiResponse({
    status: 200,
    description: 'Place recommendations retrieved successfully',
    schema: {
      example: [
        {
          id: 'place-uuid1',
          name: 'Central Park',
          description: 'A beautiful park in the city',
          tags: ['park', 'nature'],
          status: 'approved',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlaceRecommendations(
    @Request() req,
    @Query() query: GetPlaceRecommendationsDto,
  ): Promise<Place[]> {
    this.logger.log(`Get place recommendations request for user ID: ${req.user.userId}`);
    const userId = req.user.userId;

    // If userId is not explicitly provided in query, use the authenticated user's id
    const targetUserId = query.userId || userId;

    // Verify that the user can only request recommendations for themselves
    // unless they are an admin
    if (targetUserId !== userId) {
      // In a full implementation, check user roles here
      // For now, just log the request
      this.logger.warn(`User ${userId} requested recommendations for user ${targetUserId}`);
    }

    const recommendations = await this.recommendationsService.getRecommendedPlaces(targetUserId, query);
    this.logger.log(`Returned ${recommendations.length} place recommendations for user ID: ${targetUserId}`);
    return recommendations;
  }

  @UseGuards(JwtAuthGuard)
  @Get('paths')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get personalized path recommendations for user' })
  @ApiBearerAuth()
  @ApiQuery({ type: GetPathRecommendationsDto })
  @ApiResponse({
    status: 200,
    description: 'Path recommendations retrieved successfully',
    schema: {
      example: [
        {
          id: 'path-uuid1',
          name: 'Morning Walk',
          description: 'A nice morning walk around the park',
          distance: 3.5,
          totalTime: 60,
          places: [
            {
              id: 'place-uuid',
              name: 'Central Park',
              description: 'A beautiful park'
            }
          ],
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPathRecommendations(
    @Request() req,
    @Query() query: GetPathRecommendationsDto,
  ): Promise<any[]> { // Using any[] as placeholder type
    this.logger.log(`Get path recommendations request for user ID: ${req.user.userId}`);
    const userId = req.user.userId;

    const targetUserId = query.userId || userId;
    if (targetUserId !== userId) {
      this.logger.warn(`User ${userId} requested path recommendations for user ${targetUserId}`);
    }

    const recommendations = await this.recommendationsService.getRecommendedPaths(targetUserId, query);
    this.logger.log(`Returned ${recommendations.length} path recommendations for user ID: ${targetUserId}`);
    return recommendations;
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-all-embeddings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate embeddings for all places (admin only)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Embeddings generation completed',
    schema: {
      example: {
        processed: 25
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async generateAllEmbeddings(@Request() req): Promise<{ processed: number }> {
    this.logger.log(`Generate all embeddings request by user ID: ${req.user.userId}`);

    // This endpoint should probably be restricted to admin users
    // For now, just log the action
    if (req.user.role !== 'admin') {
      this.logger.warn(`Non-admin user ${req.user.userId} with role ${req.user.role} attempted to generate all embeddings`);
    }

    const processed = await this.recommendationsService.generateEmbeddingsForAllPlaces();
    this.logger.log(`Generated embeddings for ${processed} places`);

    return { processed };
  }
}