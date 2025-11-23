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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PathsService } from './paths.service';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { GeneratePathDto } from './dto/generate-path.dto';
import { PathFilterDto } from './dto/path-filter.dto';

@Controller('paths')
export class PathsController {
  private readonly logger = new Logger(PathsController.name);

  constructor(private readonly pathsService: PathsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPath(@Body() createPathDto: CreatePathDto) {
    this.logger.log('Creating new path');
    return await this.pathsService.createPath(createPathDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePath(@Body() generatePathDto: GeneratePathDto) {
    this.logger.log('Generating new path based on criteria');
    return await this.pathsService.generatePath(generatePathDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findPaths(@Query() pathFilterDto: PathFilterDto) {
    this.logger.log('Searching for paths');
    return await this.pathsService.findPaths(pathFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPath(@Param('id') id: string) {
    this.logger.log(`Getting path with ID: ${id}`);
    return await this.pathsService.getPathById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePath(@Param('id') id: string, @Body() updatePathDto: UpdatePathDto) {
    this.logger.log(`Updating path with ID: ${id}`);
    return await this.pathsService.updatePath(id, updatePathDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePath(@Param('id') id: string) {
    this.logger.log(`Deleting path with ID: ${id}`);
    return await this.pathsService.deletePath(id);
  }
}