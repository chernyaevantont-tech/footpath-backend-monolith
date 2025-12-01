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
import { WalksService } from './walks.service';
import { CreateWalkDto } from './dto/create-walk.dto';
import { UpdateWalkDto } from './dto/update-walk.dto';
import { InviteParticipantsDto } from './dto/invite-participants.dto';
import { RespondToInvitationDto } from './dto/respond-to-invitation.dto';
import { CompleteWalkDto } from './dto/complete-walk.dto';
import { WalkResponseDto } from './dto/walk-response.dto';
import { WalksListResponseDto } from './dto/walks-list-response.dto';

@ApiTags('Walks')
@Controller('walks')
export class WalksController {
  private readonly logger = new Logger(WalksController.name);

  constructor(private readonly walksService: WalksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new walk' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateWalkDto })
  @ApiResponse({
    status: 201,
    description: 'Walk created successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWalk(@Request() req, @Body() createWalkDto: CreateWalkDto) {
    this.logger.log(`User ${req.user.id} creating walk`);
    return await this.walksService.createWalk(req.user.id, createWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get walks for the authenticated user' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date' })
  @ApiResponse({
    status: 200,
    description: 'Walks retrieved successfully',
    type: WalksListResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWalks(@Request() req, @Query() query) {
    this.logger.log(`User ${req.user.id} fetching walks`);
    return await this.walksService.getWalks(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific walk by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Walk retrieved successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async getWalk(@Request() req, @Param('id') id: string) {
    this.logger.log(`User ${req.user.id} fetching walk ${id}`);
    return await this.walksService.getWalkById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a specific walk' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiBody({ type: UpdateWalkDto })
  @ApiResponse({
    status: 200,
    description: 'Walk updated successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async updateWalk(@Request() req, @Param('id') id: string, @Body() updateWalkDto: UpdateWalkDto) {
    this.logger.log(`User ${req.user.id} updating walk ${id}`);
    return await this.walksService.updateWalk(id, req.user.id, updateWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite participants to a walk' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiBody({ type: InviteParticipantsDto })
  @ApiResponse({
    status: 200,
    description: 'Participants invited successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async inviteParticipants(@Request() req, @Param('id') id: string, @Body() inviteDto: InviteParticipantsDto) {
    this.logger.log(`User ${req.user.id} inviting participants to walk ${id}`);
    return await this.walksService.inviteParticipants(req.user.id, id, inviteDto.userIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a walk invitation' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiBody({ type: RespondToInvitationDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation responded to successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async respondToInvitation(@Request() req, @Param('id') id: string, @Body() respondDto: RespondToInvitationDto) {
    this.logger.log(`User ${req.user.id} responding to invitation for walk ${id}`);
    return await this.walksService.respondToInvitation(req.user.id, id, respondDto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a walk' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiBody({ type: CompleteWalkDto })
  @ApiResponse({
    status: 200,
    description: 'Walk completed successfully',
    type: WalkResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async completeWalk(@Request() req, @Param('id') id: string, @Body() completeWalkDto: CompleteWalkDto) {
    this.logger.log(`User ${req.user.id} completing walk ${id}`);
    return await this.walksService.completeWalk(req.user.id, id, completeWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a walk' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Walk ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Walk deleted successfully',
    schema: {
      example: {
        message: 'Walk deleted successfully',
        id: 'walk-uuid'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Walk not found' })
  async deleteWalk(@Request() req, @Param('id') id: string) {
    this.logger.log(`User ${req.user.id} deleting walk ${id}`);
    return await this.walksService.deleteWalk(id, req.user.id);
  }
}