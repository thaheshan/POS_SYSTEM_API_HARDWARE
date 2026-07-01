import { IsNumber, IsString, IsArray } from 'class-validator';

export class ChartDataPointDto {
  @IsString()
  label: string;

  @IsNumber()
  value: number;
}

export class RevenueChartDto {
  @IsArray()
  data: ChartDataPointDto[];

  @IsNumber()
  total: number;
}

export class CategoryChartDto {
  @IsArray()
  data: ChartDataPointDto[];

  @IsNumber()
  total: number;
}

export class StaffChartDto {
  @IsArray()
  data: ChartDataPointDto[];

  @IsNumber()
  total: number;
}

export class PaymentBreakdownDto {
  @IsNumber()
  cash: number;

  @IsNumber()
  card: number;

  @IsNumber()
  credit: number;

  percentages: {
    cash: number | string;
    card: number | string;
    credit: number | string;
  };
}
