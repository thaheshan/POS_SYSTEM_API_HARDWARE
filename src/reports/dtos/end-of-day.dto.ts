import {
  IsDateString,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class EndOfDayReportRequestDto {
  @IsDateString()
  date: string; // Format: YYYY-MM-DD

  @IsString()
  branch_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  operating_expenses?: number; // Optional operating expenses for profit calculation
}
