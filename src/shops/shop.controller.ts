import { Controller, Get, Put, Post, Delete, Body, UseGuards, Req, BadRequestException, UsePipes, ValidationPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateShopProfileDto } from './dto/update-shop-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@ApiTags('Shop')
@Controller('shop')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get currently logged-in shop profile information' })
  @ApiResponse({ status: 200, description: 'Shop profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Shop profile not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve shop profile' })
  async getProfile(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.shopsService.getShopProfile(tenantId);
  }

  @Put('profile')
  @Roles('OWNER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update currently logged-in shop profile information' })
  @ApiResponse({ status: 200, description: 'Shop profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 409, description: 'Business registration number already exists' })
  @ApiResponse({ status: 500, description: 'Failed to update shop profile' })
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateShopProfileDto,
  ) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.sub;
    if (!tenantId || !userId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.shopsService.updateShopProfile(tenantId, userId, dto);
  }

  @Post('logo/upload')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Invalid file format'), false);
      }
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload and update the shop logo' })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 413, description: 'File size exceeds maximum allowed limit' })
  @ApiResponse({ status: 500, description: 'Failed to upload logo' })
  async uploadLogo(
    @Req() req: AuthRequest,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const tenantId = req.user?.tenant_id;
    const userId = req.user?.sub;
    if (!tenantId || !userId) {
      throw new BadRequestException('User is not associated with any shop');
    }

    const result = await this.shopsService.uploadLogo(tenantId, file, userId);
    return {
      logo_url: result.logo_url,
    };
  }

  @Delete('logo')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove the current shop logo' })
  @ApiResponse({ status: 200, description: 'Shop logo removed successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to remove shop logo' })
  @ApiResponse({ status: 404, description: 'No shop logo found' })
  @ApiResponse({ status: 500, description: 'Failed to remove shop logo' })
  async removeLogo(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.sub;
    if (!tenantId || !userId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.shopsService.removeLogo(tenantId, userId);
  }
}


