import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EndOfDayService } from './end-of-day.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EndOfDayReportRequestDto } from '../dtos/end-of-day.dto';
import { ReportResponseDto } from '../dtos/report-response.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class EndOfDayController {
  constructor(private readonly endOfDayService: EndOfDayService) {}

  @Post('end-of-day')
  @HttpCode(HttpStatus.OK)
  async generateEndOfDayReport(
    @Body() dto: EndOfDayReportRequestDto,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<ReportResponseDto> {
    return this.endOfDayService.generateEndOfDayReport(tenantId, dto);
  }
}
