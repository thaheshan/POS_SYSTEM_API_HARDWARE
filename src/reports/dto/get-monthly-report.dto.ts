import { IsString, Matches, IsOptional, IsEnum } from 'class-validator';
import { ExportFormat } from './get-weekly-report.dto';

export class GetMonthlyReportDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month!: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  export?: ExportFormat;
}
