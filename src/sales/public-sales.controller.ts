import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('Public Sales')
@Controller('public/sales')
export class PublicSalesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('test-sms')
  async testSms() {
    try {
      const response = await axios.post(
        'https://app.text.lk/api/v3/sms/send',
        {
          recipient: '94756645486',
          sender_id: 'TextLKDemo',
          type: 'plain',
          message: 'This is a direct test message from API',
        },
        {
          headers: {
            Authorization: `Bearer 5712|3BWcH4C9bFA69kplnjXmXlauJmxG1HIsPuXef5RF1eafd116`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        status: error.response?.status, 
        data: error.response?.data, 
        message: error.message 
      };
    }
  }

  @Get('receipt/:id')
  @ApiOperation({ summary: 'Get a receipt by ID for public view (without auth)' })
  async getReceipt(@Param('id') id: string) {
    // Only query by valid UUID to prevent guessing
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      throw new NotFoundException('Invalid receipt ID format');
    }

    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        shop: { select: { name: true, address: true, city: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, sellingPrice: true } }
          }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundException('Receipt not found');
    }

    return {
      status: 'success',
      data: invoice
    };
  }
}
