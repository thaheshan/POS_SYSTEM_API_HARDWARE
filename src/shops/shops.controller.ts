import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post('logo')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Only JPG, JPEG, and PNG files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadLogo(
    @Req() req: AuthRequest,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!req.user.tenant_id) {
      throw new BadRequestException('User does not belong to a shop');
    }

    return this.shopsService.uploadLogo(req.user.tenant_id, file);
  }
}
