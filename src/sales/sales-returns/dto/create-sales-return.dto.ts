import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnCondition, RefundMethod } from '@prisma/client';

export enum PaymentStatus {
  FULL = 'full',
  PARTIAL = 'partial',
}

export class CreateSalesReturnItemDto {
  @IsUUID()
  invoiceItemId!: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  @IsOptional()
  variantId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsEnum(ReturnCondition)
  condition!: ReturnCondition;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  lineTotal!: number;
}

export class CreateSalesReturnDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  invoiceId!: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsEnum(PaymentStatus)
  returnType!: PaymentStatus;

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  taxAmount!: number;

  @IsNumber()
  totalAmount!: number;

  @IsEnum(RefundMethod)
  refundMethod!: RefundMethod;

  @IsString()
  @IsOptional()
  returnReason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  items!: CreateSalesReturnItemDto[];
}
