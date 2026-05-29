import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.expensesService.create(req.user.tenant_id, req.user.user_id, body);
  }

  @Get()
  async findAll(@Req() req: any, @Query('category') category?: string) {
    const isStaff = req.user.role === 'staff' || req.user.role === 'cashier';
    const userId = isStaff ? req.user.user_id : undefined;
    return this.expensesService.findAll(req.user.tenant_id, userId, category);
  }
}
