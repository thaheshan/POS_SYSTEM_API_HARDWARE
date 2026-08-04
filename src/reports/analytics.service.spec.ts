import { HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import {
  CategoryPerformance,
  CustomerInsight,
  DailyRevenueMetric,
  ReorderSuggestion,
  StaffPerformance,
  TaxUpdate,
  WeeklyAnalyticsReport,
} from './interfaces/analytics-report.interface';

type WeeklyReportInput = {
  week_start: string;
};

type ReportCreateArgs = {
  data: {
    tenantId: string;
    reportType: 'WEEKLY' | 'MONTHLY';
    startDate: Date;
    endDate: Date;
    expiresAt: Date;
    data: Prisma.InputJsonValue;
  };
};

type AnalyticsServiceSpyTarget = {
  getReorderSuggestions: (tenantId: string) => Promise<ReorderSuggestion[]>;
  getDailyRevenue: (
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) => Promise<DailyRevenueMetric[]>;
  getCategoryPerformance: (
    tenantId: string,
    startDate: Date,
    endDate: Date,
    reportType: 'WEEKLY' | 'MONTHLY',
  ) => Promise<CategoryPerformance[]>;
  getCustomerInsights: (
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) => Promise<CustomerInsight[]>;
  getStaffPerformance: (
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) => Promise<StaffPerformance[]>;
  getTaxUpdate: (
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) => Promise<TaxUpdate>;
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const prismaMock = {
    generatedReport: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    salesInvoice: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    salesInvoiceItem: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    stock: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    advanceTaxPayment: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(prismaMock as never);
  });

  it('returns cached weekly report when cache exists', async () => {
    const cachedReport: WeeklyAnalyticsReport = {
      tenantId: 'tenant-1',
      weekStart: '2026-05-11',
      dailyRevenue: [],
      categoryPerformance: [],
      reorderSuggestions: [],
      customerInsights: [],
      taxUpdate: {
        periodProfit: 0,
        ytdIncome: 0,
        estimatedTaxLiability: 0,
        advanceTaxPaid: 0,
        projectedBalanceDue: 0,
      },
      staffPerformance: [],
    };

    prismaMock.generatedReport.findFirst.mockResolvedValue({
      data: cachedReport,
    });

    const result = await service.generateWeeklyReport('tenant-1', {
      week_start: '2026-05-11',
    });

    expect(result).toEqual(cachedReport);
    expect(prismaMock.generatedReport.create).not.toHaveBeenCalled();
  });

  it('creates a weekly report with expiresAt on cache miss', async () => {
    prismaMock.generatedReport.findFirst.mockResolvedValue(null);

    const mockedService = service as unknown as AnalyticsServiceSpyTarget;

    jest.spyOn(mockedService, 'getReorderSuggestions').mockResolvedValue([]);
    jest.spyOn(mockedService, 'getDailyRevenue').mockResolvedValue([]);
    jest.spyOn(mockedService, 'getCategoryPerformance').mockResolvedValue([]);
    jest.spyOn(mockedService, 'getCustomerInsights').mockResolvedValue([]);
    jest.spyOn(mockedService, 'getStaffPerformance').mockResolvedValue([]);
    jest.spyOn(mockedService, 'getTaxUpdate').mockResolvedValue({
      periodProfit: 0,
      ytdIncome: 0,
      estimatedTaxLiability: 0,
      advanceTaxPaid: 0,
      projectedBalanceDue: 0,
    });

    const before = new Date();
    const result = await service.generateWeeklyReport('tenant-1', {
      week_start: '2026-05-11',
    });
    const after = new Date();

    expect(result.tenantId).toBe('tenant-1');
    expect(prismaMock.generatedReport.create).toHaveBeenCalledTimes(1);

    const createCalls = prismaMock.generatedReport.create.mock.calls as [
      [ReportCreateArgs],
    ];
    const [createArg] = createCalls[0];

    expect(createArg.data.tenantId).toBe('tenant-1');
    expect(createArg.data.reportType).toBe('WEEKLY');
    expect(createArg.data.expiresAt).toBeInstanceOf(Date);
    expect(createArg.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(createArg.data.expiresAt.getTime()).toBeLessThanOrEqual(
      after.getTime() + 24 * 60 * 60 * 1000 + 2000,
    );
  });

  it('throws through HttpException unchanged', async () => {
    prismaMock.generatedReport.findFirst.mockRejectedValue(
      new HttpException('bad request', 400),
    );

    await expect(
      service.generateWeeklyReport('tenant-1', {
        week_start: '2026-05-11',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('maps Prisma known request errors to HttpException', async () => {
    prismaMock.generatedReport.findFirst.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.6.0',
        meta: { target: ['tenantId'] },
      }),
    );

    await expect(
      service.generateWeeklyReport('tenant-1', {
        week_start: '2026-05-11',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
