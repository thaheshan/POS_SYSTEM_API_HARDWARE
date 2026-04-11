import { IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export class GetWeeklyReportDto {
  @IsDateString(
    {},
    { message: 'week_start must be a valid ISO date string (YYYY-MM-DD)' },
  )
  week_start!: string;

  @IsOptional()
  @IsEnum(ExportFormat, { message: 'export must be either csv or pdf' })
  export?: ExportFormat;
}
