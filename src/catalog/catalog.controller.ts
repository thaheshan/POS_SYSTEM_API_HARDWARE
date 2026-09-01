import { Controller, Get, Post, Query, Body, UseGuards, Req } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('search')
  async searchCatalog(@Query('q') query: string) {
    const data = await this.catalogService.searchMasterCatalog(query);
    return data;
  }

  @Post('clone')
  async cloneProduct(
    @Req() req: Request,
    @Body() payload: {
      masterProductId: string;
      warehouseId: string;
      branchId: string;
      purchasePrice: number;
      sellingPrice: number;
      quantity: number;
      customName?: string;
    },
  ) {
    const user = req.user as any;
    const clonedProduct = await this.catalogService.cloneToShop(
      user.tenant_id,
      payload.masterProductId,
      {
        ...payload,
        createdBy: user.user_id,
        customName: payload.customName,
      },
    );

    return clonedProduct;
  }
}
