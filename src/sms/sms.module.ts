import { Module, Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: any;
}

@ApiTags('SMS')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send-credit-notification')
  @ApiOperation({ summary: 'Send TEXT.LK SMS credit purchase notification' })
  async sendCreditNotification(@Body() body: any) {
    return this.smsService.sendCreditNotification(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('send-batch-credit-reminders')
  @ApiOperation({ summary: 'Trigger TEXT.LK batch credit SMS reminders for all credit customers' })
  async sendBatchCreditReminders(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user?.tenant_id || req.user?.tenantId || req.user?.tenant || req.user?.shopId;
    return this.smsService.sendBatchCreditReminders(tenantId);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
