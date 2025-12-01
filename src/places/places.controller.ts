import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/place/create-place.dto';
import { UpdatePlaceDto } from './dto/place/update-place.dto';
import { PlaceFilterDto } from './dto/place/place-filter.dto';
import { ApprovePlaceDto } from './dto/place/approve-place.dto';

@ApiTags('Places')
@Controller('places')
export class PlacesController {
  private readonly logger = new Logger(PlacesController.name);

  constructor(private readonly placesService: PlacesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new place (for moderation)' })
  @ApiBearerAuth()
  @ApiBody({ type: CreatePlaceDto })
  @ApiResponse({
    status: 201,
    description: 'Place created successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Central Park',
        description: 'A beautiful park in the city',
        tags: ['park', 'nature'],
        status: 'pending',
        creatorId: 'user-uuid-string',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createPlace(@Body() createPlaceDto: CreatePlaceDto, @Request() req) {
    this.logger.log('Creating new place');
    return await this.placesService.createPlace(createPlaceDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search for places with filters' })
  @ApiBearerAuth()
  @ApiQuery({ type: PlaceFilterDto })
  @ApiResponse({
    status: 200,
    description: 'Places retrieved successfully',
    schema: {
      example: [
        {
          id: 'uuid-string',
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
  async findPlaces(@Query() filterDto: PlaceFilterDto) {
    this.logger.log('Searching for places');
    return await this.placesService.findPlaces(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a place by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Place ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Place retrieved successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Central Park',
        description: 'A beautiful park in the city',
        tags: ['park', 'nature'],
        status: 'approved',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async getPlace(@Param('id') id: string) {
    this.logger.log(`Getting place with ID: ${id}`);
    return await this.placesService.getPlaceById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a place by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Place ID', type: String })
  @ApiBody({ type: UpdatePlaceDto })
  @ApiResponse({
    status: 200,
    description: 'Place updated successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Updated Central Park',
        description: 'A beautiful updated park in the city',
        tags: ['park', 'nature', 'updated'],
        status: 'pending',
        creatorId: 'user-uuid-string',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async updatePlace(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto, @Request() req) {
    this.logger.log(`Updating place with ID: ${id}`);
    return await this.placesService.updatePlace(id, updatePlaceDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a place (moderator only)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Place ID', type: String })
  @ApiBody({ type: ApprovePlaceDto })
  @ApiResponse({
    status: 200,
    description: 'Place approved successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Central Park',
        status: 'approved',
        moderatorId: 'moderator-uuid',
        approvedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async approvePlace(
    @Param('id') id: string,
    @Body() approvePlaceDto: ApprovePlaceDto,
    @Request() req,
  ) {
    this.logger.log(`Approving place with ID: ${id} by user: ${req.user.id}`);

    // Check if user has moderator rights
    if (!this.placesService.validateModeratorAccess(req.user)) {
      throw new UnauthorizedException('Only moderators and admins can approve places');
    }

    return await this.placesService.approvePlace(id, req.user.id, approvePlaceDto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a place (moderator only)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Place ID', type: String })
  @ApiBody({ type: ApprovePlaceDto })
  @ApiResponse({
    status: 200,
    description: 'Place rejected successfully',
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Central Park',
        status: 'rejected',
        moderatorId: 'moderator-uuid',
        rejectedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async rejectPlace(
    @Param('id') id: string,
    @Body() approvePlaceDto: ApprovePlaceDto,
    @Request() req,
  ) {
    this.logger.log(`Rejecting place with ID: ${id} by user: ${req.user.id}`);

    // Check if user has moderator rights
    if (!this.placesService.validateModeratorAccess(req.user)) {
      throw new UnauthorizedException('Only moderators and admins can reject places');
    }

    return await this.placesService.rejectPlace(id, req.user.id, approvePlaceDto.reason);
  }
}