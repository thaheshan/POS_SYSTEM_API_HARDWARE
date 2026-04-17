import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export class GetWeeklyReportDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'week_start must be in strict YYYY-MM-DD format',
  })
  @IsDateString(
    {},
    { message: 'week_start must be a valid calendar date (YYYY-MM-DD)' },
  )
  week_start!: string;

  @IsOptional()
  @IsEnum(ExportFormat, { message: 'export must be either csv or pdf' })
  export?: ExportFormat;
}
