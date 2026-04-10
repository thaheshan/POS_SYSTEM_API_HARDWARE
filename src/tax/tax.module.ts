import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { VatService } from './services/vat.service';
import { IncomeTaxService } from './services/income-tax.service';
import { DailyTaxCron } from './jobs/daily-tax.cron';
import { ReportService } from './services/report.service';

@Module({
  controllers: [TaxController],
  providers: [VatService, IncomeTaxService, DailyTaxCron, ReportService],
  exports: [VatService, IncomeTaxService],
})
export class TaxModule {}