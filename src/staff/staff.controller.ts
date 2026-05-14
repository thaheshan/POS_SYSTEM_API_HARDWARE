import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { NotifyOwnerDto } from './dto/notify-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
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

  @Post('notify-owner')
  @HttpCode(HttpStatus.OK)
  async notifyOwner(@Body() notifyOwnerDto: NotifyOwnerDto) {
    return this.staffService.notifyShopOwner(notifyOwnerDto);
  }

  @Get('status/:staff_id')
  @HttpCode(HttpStatus.OK)
  async getStaffStatus(@Param('staff_id', ParseUUIDPipe) staffId: string) {
    return this.staffService.getStaffStatus(staffId);
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
}
