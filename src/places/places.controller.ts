import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PlaceResponseDto } from './dto/place/place-response.dto';
import { PlaceFilterResponseDto } from './dto/place/place-filter-response.dto';

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
    type: PlaceResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createPlace(@Body() createPlaceDto: CreatePlaceDto, @Request() req) {
    this.logger.log('Creating new place', {
      userId: req.user.id,
      userRole: req.user.role,
      coordinates: createPlaceDto.coordinates,
      name: createPlaceDto.name,
      description: createPlaceDto.description,
      tagIds: createPlaceDto.tagIds
    });
    try {
      const result = await this.placesService.createPlace(createPlaceDto, req.user.id, req.user.role);
      this.logger.log('Successfully created place', { placeId: result.id });
      return result;
    } catch (error) {
      this.logger.error('Failed to create place', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
        userRole: req.user.role,
        coordinates: createPlaceDto.coordinates
      });
      throw error;
    }
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
    type: PlaceFilterResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findPlaces(@Query() filterDto: PlaceFilterDto, @Request() req) {
    this.logger.log('Searching for places');
    return await this.placesService.findPlaces(filterDto, { id: req.user.id, role: req.user.role });
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
    type: PlaceResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async getPlace(@Param('id') id: string) {
    this.logger.log(`Getting place with ID: ${id}`);
    return await this.placesService.getPlaceById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a place by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Place ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Place deleted successfully',
    schema: {
      example: {
        message: 'Place deleted successfully',
        id: 'place-uuid'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async deletePlace(@Param('id') id: string, @Request() req) {
    this.logger.log(`Deleting place with ID: ${id}, by user: ${req.user.id}, role: ${req.user.role}`);
    return await this.placesService.deletePlace(id, req.user.id, req.user.role);
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
    type: PlaceResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async updatePlace(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto, @Request() req) {
    this.logger.log(`Updating place with ID: ${id}, by user: ${req.user.id}, role: ${req.user.role}`);
    return await this.placesService.updatePlace(id, updatePlaceDto, req.user.id, req.user.role);
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
    type: PlaceResponseDto
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
    type: PlaceResponseDto
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