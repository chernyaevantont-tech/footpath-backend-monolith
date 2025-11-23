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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlaceFilterDto } from './dto/place-filter.dto';
import { ApprovePlaceDto } from './dto/approve-place.dto';

@Controller('places')
export class PlacesController {
  private readonly logger = new Logger(PlacesController.name);

  constructor(private readonly placesService: PlacesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlace(@Body() createPlaceDto: CreatePlaceDto) {
    this.logger.log('Creating new place');
    return await this.placesService.createPlace(createPlaceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findPlaces(@Query() filterDto: PlaceFilterDto) {
    this.logger.log('Searching for places');
    return await this.placesService.findPlaces(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPlace(@Param('id') id: string) {
    this.logger.log(`Getting place with ID: ${id}`);
    return await this.placesService.getPlaceById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePlace(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto) {
    this.logger.log(`Updating place with ID: ${id}`);
    return await this.placesService.updatePlace(id, updatePlaceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
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