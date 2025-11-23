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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalksService } from './walks.service';
import { CreateWalkDto } from './dto/create-walk.dto';
import { UpdateWalkDto } from './dto/update-walk.dto';
import { InviteParticipantsDto } from './dto/invite-participants.dto';
import { RespondToInvitationDto } from './dto/respond-to-invitation.dto';
import { CompleteWalkDto } from './dto/complete-walk.dto';

@Controller('walks')
export class WalksController {
  private readonly logger = new Logger(WalksController.name);

  constructor(private readonly walksService: WalksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWalk(@Request() req, @Body() createWalkDto: CreateWalkDto) {
    this.logger.log(`User ${req.user.id} creating walk`);
    return await this.walksService.createWalk(req.user.id, createWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWalks(@Request() req, @Query() query) {
    this.logger.log(`User ${req.user.id} fetching walks`);
    return await this.walksService.getWalks(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getWalk(@Request() req, @Param('id') id: string) {
    this.logger.log(`User ${req.user.id} fetching walk ${id}`);
    return await this.walksService.getWalkById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateWalk(@Request() req, @Param('id') id: string, @Body() updateWalkDto: UpdateWalkDto) {
    this.logger.log(`User ${req.user.id} updating walk ${id}`);
    return await this.walksService.updateWalk(id, req.user.id, updateWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  async inviteParticipants(@Request() req, @Param('id') id: string, @Body() inviteDto: InviteParticipantsDto) {
    this.logger.log(`User ${req.user.id} inviting participants to walk ${id}`);
    return await this.walksService.inviteParticipants(req.user.id, id, inviteDto.userIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respondToInvitation(@Request() req, @Param('id') id: string, @Body() respondDto: RespondToInvitationDto) {
    this.logger.log(`User ${req.user.id} responding to invitation for walk ${id}`);
    return await this.walksService.respondToInvitation(req.user.id, id, respondDto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeWalk(@Request() req, @Param('id') id: string, @Body() completeWalkDto: CompleteWalkDto) {
    this.logger.log(`User ${req.user.id} completing walk ${id}`);
    return await this.walksService.completeWalk(req.user.id, id, completeWalkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteWalk(@Request() req, @Param('id') id: string) {
    this.logger.log(`User ${req.user.id} deleting walk ${id}`);
    return await this.walksService.deleteWalk(id, req.user.id);
  }
}