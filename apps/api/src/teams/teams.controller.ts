import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';
import { TeamManagerGuard } from './guards/team-manager.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

@Controller('teams')
@UseGuards(AccessTokenGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTeam(@Req() req: Request, @Body() dto: CreateTeamDto) {
    const user = req.user as AccessTokenUser;
    return this.teamsService.createTeam(user.userId, dto);
  }

  @Get('my')
  async getMyTeams(@Req() req: Request) {
    const user = req.user as AccessTokenUser;
    return this.teamsService.getMyTeams(user.userId);
  }

  // IMPORTANT: This literal route must be declared BEFORE the parameterized :id route
  // to prevent 'invitations' being matched as a team :id
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Req() req: Request, @Body() dto: AcceptInvitationDto) {
    const user = req.user as AccessTokenUser;
    const result = await this.teamsService.acceptInvitation(dto.token, user);
    return { message: 'Joined team', teamId: result.teamId };
  }

  @Get(':id/members')
  async getTeamMembers(@Param('id') teamId: string) {
    return this.teamsService.getTeamMembers(teamId);
  }

  @Get(':id/invitations')
  @UseGuards(TeamManagerGuard)
  async getPendingInvitations(@Param('id') teamId: string) {
    return this.teamsService.getPendingInvitations(teamId);
  }

  @Post(':id/invitations')
  @UseGuards(TeamManagerGuard)
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Req() req: Request,
    @Param('id') teamId: string,
    @Body() dto: InviteMemberDto,
  ) {
    const user = req.user as AccessTokenUser;
    await this.teamsService.inviteMember(teamId, user.userId, dto);
    return { message: 'Invitation sent' };
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveTeam(@Req() req: Request, @Param('id') teamId: string) {
    const user = req.user as AccessTokenUser;
    await this.teamsService.leaveTeam(teamId, user.userId);
    return { message: 'Left team' };
  }

  @Post(':id/transfer-ownership')
  @UseGuards(TeamManagerGuard)
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @Req() req: Request,
    @Param('id') teamId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    const user = req.user as AccessTokenUser;
    await this.teamsService.transferOwnership(teamId, user.userId, dto.targetUserId);
    return { message: 'Ownership transferred' };
  }

  @Delete(':id/members/:userId')
  @UseGuards(TeamManagerGuard)
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Req() req: Request,
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
  ) {
    const user = req.user as AccessTokenUser;
    await this.teamsService.removeMember(teamId, user.userId, targetUserId);
    return { message: 'Member removed' };
  }

  @Delete(':id/invitations/:email')
  @UseGuards(TeamManagerGuard)
  @HttpCode(HttpStatus.OK)
  async cancelInvitation(
    @Param('id') teamId: string,
    @Param('email') email: string,
  ) {
    const decodedEmail = decodeURIComponent(email);
    await this.teamsService.cancelInvitation(teamId, decodedEmail);
    return { message: 'Invitation cancelled' };
  }

  @Delete(':id')
  @UseGuards(TeamManagerGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTeam(@Param('id') teamId: string) {
    await this.teamsService.deleteTeam(teamId);
    return { message: 'Team deleted' };
  }
}
