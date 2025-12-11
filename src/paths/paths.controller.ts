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
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PathsService } from './paths.service';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { GeneratePathDto } from './dto/generate-path.dto';
import { PathFilterDto } from './dto/path-filter.dto';
import { PathResponseDto } from './dto/path-response.dto';
import { PathsListResponseDto } from './dto/paths-list-response.dto';

@ApiTags('Paths')
@Controller('paths')
export class PathsController {
  private readonly logger = new Logger(PathsController.name);

  constructor(private readonly pathsService: PathsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new saved path' })
  @ApiBearerAuth()
  @ApiBody({ type: CreatePathDto })
  @ApiResponse({
    status: 201,
    description: 'Path created successfully',
    type: PathResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPath(@Body() createPathDto: CreatePathDto) {
    this.logger.log('Creating new path');
    return await this.pathsService.createPath(createPathDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new path based on criteria' })
  @ApiBearerAuth()
  @ApiBody({ type: GeneratePathDto })
  @ApiResponse({
    status: 201,
    description: 'Path generated successfully',
    type: PathResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generatePath(@Body() generatePathDto: GeneratePathDto, @Request() req) {
    this.logger.log('Generating new path based on criteria');
    return await this.pathsService.generatePath(generatePathDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search for paths with filters' })
  @ApiBearerAuth()
  @ApiQuery({ type: PathFilterDto })
  @ApiResponse({
    status: 200,
    description: 'Paths retrieved successfully',
    type: PathsListResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findPaths(@Query() pathFilterDto: PathFilterDto, @Request() req) {
    this.logger.log('Searching for paths');
    return await this.pathsService.findPaths(pathFilterDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a path by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Path ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Path retrieved successfully',
    type: PathResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  async getPath(@Param('id') id: string, @Request() req) {
    this.logger.log(`Getting path with ID: ${id}`);
    return await this.pathsService.getPathById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a path by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Path ID', type: String })
  @ApiBody({ type: UpdatePathDto })
  @ApiResponse({
    status: 200,
    description: 'Path updated successfully',
    type: PathResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  async updatePath(@Param('id') id: string, @Body() updatePathDto: UpdatePathDto, @Request() req) {
    this.logger.log(`Updating path with ID: ${id}`);
    return await this.pathsService.updatePath(id, updatePathDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a path by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Path ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Path deleted successfully',
    schema: {
      example: {
        message: 'Path deleted successfully'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  async deletePath(@Param('id') id: string, @Request() req) {
    this.logger.log(`Deleting path with ID: ${id}`);
    return await this.pathsService.deletePath(id, req.user.id);
  }
}