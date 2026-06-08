import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getRoles(@Req() req: AuthRequest) {
    return this.rolesService.getRoles(req.user.tenant_id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @Req() req: AuthRequest,
    @Body('name') name: string,
    @Body('permissions') permissions: any,
  ) {
    return this.rolesService.createRole(req.user.tenant_id, name, permissions);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body('name') name: string,
    @Body('permissions') permissions: any,
  ) {
    return this.rolesService.updateRole(id, req.user.tenant_id, name, permissions);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.rolesService.deleteRole(id, req.user.tenant_id);
  }
}
