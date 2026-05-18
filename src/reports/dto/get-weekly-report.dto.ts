import {
  IsDateString,
  IsEnum,
  IsOptional,
  Matches,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export function IsMonday(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isMonday',
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          try {
            const date = new Date(value);
            // Monday in UTC is day 1 (0=Sunday, 1=Monday, ..., 6=Saturday)
            return date.getUTCDay() === 1;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a Monday (in UTC)`;
        },
      },
    });
  };
}

export class GetWeeklyReportDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'week_start must be in strict YYYY-MM-DD format',
  })
  @IsDateString(
    {},
    { message: 'week_start must be a valid calendar date (YYYY-MM-DD)' },
  )
  @IsMonday({
    message: 'week_start must be a Monday',
  })
  week_start!: string;

  @IsOptional()
  @IsEnum(ExportFormat, { message: 'export must be either csv or pdf' })
  export?: ExportFormat;
}
