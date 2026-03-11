import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [SystemController],
})
export class SystemModule {}
