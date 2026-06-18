import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ApproveStaffDto } from './dto/approve-staff.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerStaff(@Body() registerStaffDto: RegisterStaffDto) {
    return this.staffService.registerStaff(registerStaffDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllStaff(@Req() req: AuthRequest) {
    return this.staffService.getAllStaff(req.user.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  @HttpCode(HttpStatus.OK)
  async getPendingStaff(@Req() req: AuthRequest) {
    return this.staffService.getPendingStaff(req.user.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:staff_id')
  @HttpCode(HttpStatus.OK)
  async getStaffStatus(
    @Param('staff_id', ParseUUIDPipe) staffId: string,
    @Req() req: AuthRequest,
  ) {
    return this.staffService.getStaffStatus(staffId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approveStaff(
    @Body() approveStaffDto: ApproveStaffDto,
    @Req() req: AuthRequest,
  ) {
    const ownerId = req.user.sub;
    return this.staffService.approveStaff(approveStaffDto, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':staff_id')
  @HttpCode(HttpStatus.OK)
  async updateStaff(
    @Param('staff_id', ParseUUIDPipe) staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() req: AuthRequest,
  ) {
    const ownerId = req.user.sub;
    return this.staffService.updateStaff(staffId, req.user.tenant_id, updateStaffDto, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':staff_id')
  @HttpCode(HttpStatus.OK)
  async deleteStaff(
    @Param('staff_id', ParseUUIDPipe) staffId: string,
    @Req() req: AuthRequest,
  ) {
    const ownerId = req.user.sub;
    return this.staffService.deleteStaff(staffId, req.user.tenant_id, ownerId);
  }
}
