import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Response,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { generateQuotationPdf } from './utils/pdf-generator';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import {
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
  ConvertToInvoiceDto,
  QuotationResponse,
  QuotationsPaginatedResponse,
} from './dto/quotation.dto';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateQuotationDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.createQuotation(tenantId, dto, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<QuotationsPaginatedResponse> {
    return this.quotationsService.getQuotations(tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.getQuotationById(tenantId, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.updateQuotation(tenantId, id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationStatusDto,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  async convertToInvoice(
    @Param('id') id: string,
    @Body() dto: ConvertToInvoiceDto,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<{ invoiceId: string; message: string }> {
    return this.quotationsService.convertToInvoice(tenantId, id, dto);
  }

  @Get(':id/pdf')
  @HttpCode(HttpStatus.OK)
  async generatePdf(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Response() res: ExpressResponse,
  ): Promise<void> {
    const quotation = await this.quotationsService.getQuotationById(
      tenantId,
      id,
    );

    const pdfBuffer = await generateQuotationPdf(quotation, {
      shopInfo: {
        shopName: 'ABC Hardware',
        address: '123 Business St, City, Country',
        phone: '+1 (555) 123-4567',
        email: 'info@abchardware.lk',
        vatRegistrationNumber: 'VAT123456789',
      },
      termsConditions: 'Payment due within 30 days of quotation date.',
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="QUO-${quotation.quotationNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
