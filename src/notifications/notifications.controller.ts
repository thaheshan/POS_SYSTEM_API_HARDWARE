import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('low-stock')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Send low stock alert SMS' })
async sendLowStockAlert(@Body() body: {
  tenantId: string;
  productId: string;
  productName: string;
  currentQty: number;
  minQty: number;
  ownerPhone: string;
}) {
  const result = await this.notificationsService.sendLowStockAlert(
    body.tenantId,
    body.productId,
    body.productName,
    body.currentQty,
    body.minQty,
    body.ownerPhone,
  );
  return result;
}

  @Post('large-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send large transaction alert SMS' })
  async sendLargeTransactionAlert(@Body() body: {
    tenantId: string;
    amount: number;
    branchName: string;
    ownerPhone: string;
    invoiceId: string;
  }) {
    await this.notificationsService.sendLargeTransactionAlert(
      body.tenantId,
      body.amount,
      body.branchName,
      body.ownerPhone,
      body.invoiceId,
    );
    return { message: 'Large transaction alert queued' };
  }

  @Post('invoice-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invoice email to customer' })
  async sendInvoiceEmail(@Body() body: {
    tenantId: string;
    customerEmail: string;
    invoiceId: string;
    invoiceNumber: string;
    grandTotal?: number;
  }) {
    await this.notificationsService.sendInvoiceEmail(
      body.tenantId,
      body.customerEmail,
      body.invoiceId,
      body.invoiceNumber,
      body.grandTotal,
    );
    return { message: 'Invoice email queued' };
  }

  @Post('welcome-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send welcome email to new staff' })
  async sendWelcomeEmail(@Body() body: {
    tenantId: string;
    staffEmail: string;
    staffName: string;
  }) {
    await this.notificationsService.sendWelcomeEmail(
      body.tenantId,
      body.staffEmail,
      body.staffName,
    );
    return { message: 'Welcome email queued' };
  }

  @Post('quotation-email')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Send quotation PDF email to customer' })
async sendQuotationEmail(@Body() body: {
  tenantId: string;
  customerEmail: string;
  quotationId: string;
  quotationNumber: string;
  grandTotal?: number;
}) {
  await this.notificationsService.sendQuotationEmail(
    body.tenantId,
    body.customerEmail,
    body.quotationId,
    body.quotationNumber,
    body.grandTotal,
  );
  return { message: 'Quotation email sent' };
}

@Post('purchase-order-email')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Send purchase order PDF email to supplier' })
async sendPurchaseOrderEmail(@Body() body: {
  tenantId: string;
  supplierEmail: string;
  poId: string;
  poNumber: string;
  grandTotal?: number;
}) {
  await this.notificationsService.sendPurchaseOrderEmail(
    body.tenantId,
    body.supplierEmail,
    body.poId,
    body.poNumber,
    body.grandTotal,
  );
  return { message: 'Purchase order email sent' };
}

@Post('tax-reminder')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Send tax payment reminder SMS' })
async sendTaxReminder(@Body() body: {
  tenantId: string;
  ownerPhone: string;
  estimatedVat: number;
}) {
  const message = `REMINDER: VAT payment due in 7 days. Estimated payable: Rs. ${body.estimatedVat.toLocaleString()}. - ABC Hardware`;
  await this.notificationsService.sendTaxReminderSms(
    body.ownerPhone,
    message,
    body.tenantId,
  );
  return { message: 'Tax reminder SMS sent' };
}
}