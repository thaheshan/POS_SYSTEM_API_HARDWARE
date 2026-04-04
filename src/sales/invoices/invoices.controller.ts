import {
  Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@ApiTags('Sales Invoices')
@Controller('sales/invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,  
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create sales invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'branch_id', required: false })
  @ApiQuery({ name: 'cashier_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('date') date?: string,
    @Query('branch_id') branch_id?: string,
    @Query('cashier_id') cashier_id?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll({ date, branch_id, cashier_id, status });
  }

  @Get(':id/pdf') 
  @ApiOperation({ summary: 'Generate PDF invoice' })
  @ApiResponse({ status: 200, description: 'PDF generated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async generatePdf(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const pdfBuffer = await this.pdfService.generateInvoicePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }
}