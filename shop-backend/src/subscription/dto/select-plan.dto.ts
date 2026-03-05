import { IsNotEmpty, IsString } from 'class-validator';

export class SelectPlanDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;
}
