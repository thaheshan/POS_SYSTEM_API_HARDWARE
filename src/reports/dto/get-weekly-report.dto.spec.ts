import { validate } from 'class-validator';
import { GetWeeklyReportDto, ExportFormat } from './get-weekly-report.dto';

it('accepts a Monday', async () => {
  const dto = new GetWeeklyReportDto();
  dto.week_start = '2026-05-11';
  dto.export = ExportFormat.CSV;

  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
});

it('rejects a non-Monday', async () => {
  const dto = new GetWeeklyReportDto();
  dto.week_start = '2026-05-12';

  const errors = await validate(dto);
  expect(errors.some((error) => error.property === 'week_start')).toBe(true);
});
