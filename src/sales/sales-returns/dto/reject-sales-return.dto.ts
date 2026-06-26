import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSalesReturnDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}
