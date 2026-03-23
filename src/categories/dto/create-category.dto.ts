import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;

  @IsOptional()
  @IsUUID('all', { message: 'Parent Category ID must be a valid UUID' })
  parent_category_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}
