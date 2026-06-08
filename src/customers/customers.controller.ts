import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async getCustomers(@Req() req: any, @Query() query: any) {
    return this.customersService.getCustomers(req.user.tenant_id, query);
  }

  @Post()
  async createCustomer(@Req() req: any, @Body() body: any) {
    return this.customersService.createCustomer(req.user.tenant_id, body);
  }

  @Patch(':id')
  async updateCustomer(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.customersService.updateCustomer(req.user.tenant_id, id, body);
  }

  @Delete(':id')
  async deleteCustomer(@Req() req: any, @Param('id') id: string) {
    return this.customersService.deleteCustomer(req.user.tenant_id, id);
  }
}
