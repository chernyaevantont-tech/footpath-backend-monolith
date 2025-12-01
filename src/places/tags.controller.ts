import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateTagDto } from './dto/tag/create-tag.dto';
import { UpdateTagDto } from './dto/tag/update-tag.dto';
import { TagResponseDto } from './dto/tag/tag-response.dto';
import { PlacesService } from './places.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly placesService: PlacesService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tag (moderator only)' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: TagResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createTag(@Body() createTagDto: CreateTagDto, @Request() req) {
    this.logger.log(`Creating new tag by user: ${req.user.id}`);
    return await this.placesService.createTag(createTagDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'Tags retrieved successfully',
    type: [TagResponseDto]
  })
  async getAllTags() {
    this.logger.log('Getting all tags');
    return await this.placesService.getAllTags();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiParam({ name: 'id', description: 'Tag ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Tag retrieved successfully',
    type: TagResponseDto
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async getTag(@Param('id') id: string) {
    this.logger.log(`Getting tag with ID: ${id}`);
    return await this.placesService.getTagById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a tag by ID (moderator only)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Tag ID', type: String })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
    type: TagResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async updateTag(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto, @Request() req) {
    this.logger.log(`Updating tag with ID: ${id} by user: ${req.user.id}`);
    
    // Check if user has moderator rights
    if (!this.placesService.validateModeratorAccess(req.user)) {
      throw new BadRequestException('Only moderators and admins can update tags');
    }
    
    return await this.placesService.updateTag(id, updateTagDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tag by ID (moderator only)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Tag ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async deleteTag(@Param('id') id: string, @Request() req) {
    this.logger.log(`Deleting tag with ID: ${id} by user: ${req.user.id}`);
    
    // Check if user has moderator rights
    if (!this.placesService.validateModeratorAccess(req.user)) {
      throw new BadRequestException('Only moderators and admins can delete tags');
    }
    
    await this.placesService.deleteTag(id);
    return { message: 'Tag deleted successfully' };
  }
}