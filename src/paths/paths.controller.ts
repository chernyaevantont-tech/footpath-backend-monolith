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
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PathsService } from './paths.service';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { GeneratePathDto } from './dto/generate-path.dto';
import { PathFilterDto } from './dto/path-filter.dto';

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
    schema: {
      example: {
        id: 'uuid-string',
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
    }
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
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Generated Walk',
        description: 'A walk generated based on your criteria',
        distance: 2.8,
        totalTime: 45,
        places: [
          {
            id: 'place-uuid1',
            name: 'Park A',
            description: 'Beautiful park A'
          },
          {
            id: 'place-uuid2',
            name: 'Café B',
            description: 'Nice café'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generatePath(@Body() generatePathDto: GeneratePathDto) {
    this.logger.log('Generating new path based on criteria');
    return await this.pathsService.generatePath(generatePathDto);
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
    schema: {
      example: [
        {
          id: 'uuid-string',
          name: 'Morning Walk',
          description: 'A nice morning walk around the park',
          distance: 3.5,
          totalTime: 60,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findPaths(@Query() pathFilterDto: PathFilterDto) {
    this.logger.log('Searching for paths');
    return await this.pathsService.findPaths(pathFilterDto);
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
    schema: {
      example: {
        id: 'uuid-string',
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
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  async getPath(@Param('id') id: string) {
    this.logger.log(`Getting path with ID: ${id}`);
    return await this.pathsService.getPathById(id);
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
    schema: {
      example: {
        id: 'uuid-string',
        name: 'Updated Morning Walk',
        description: 'An updated morning walk around the park',
        distance: 3.7,
        totalTime: 65,
        places: [
          {
            id: 'place-uuid',
            name: 'Central Park',
            description: 'A beautiful updated park'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  async updatePath(@Param('id') id: string, @Body() updatePathDto: UpdatePathDto) {
    this.logger.log(`Updating path with ID: ${id}`);
    return await this.pathsService.updatePath(id, updatePathDto);
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
  async deletePath(@Param('id') id: string) {
    this.logger.log(`Deleting path with ID: ${id}`);
    return await this.pathsService.deletePath(id);
  }
}