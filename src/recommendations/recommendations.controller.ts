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
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetPlaceRecommendationsDto, GetPathRecommendationsDto } from './dto/recommendation.dto';
import { Place } from '../places/entities/place.entity';

@Controller('recommendations')
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(private recommendationsService: RecommendationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('places')
  @HttpCode(HttpStatus.OK)
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