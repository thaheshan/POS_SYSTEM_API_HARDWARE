import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, TaxCategory } from '@prisma/client';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, TaxCategoryDto } from './dto/create-product.dto';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaService;

  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const prismaMock = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    stock: {
      createMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    productSkuSequence: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates product with variants and stock rows', async () => {
    const dto: CreateProductDto = {
      name: 'PVC Pipe',
      category_id: 'cat-1',
      selling_price: 100,
      purchase_price: 80,
      tax_category: TaxCategoryDto.standard_vat,
      has_variants: true,
      variants: [
        { variant_name: '20mm', selling_price: 110 },
        { variant_name: '25mm', selling_price: 120 },
      ],
    };

    prismaMock.category.findFirst = jest
      .fn()
      .mockResolvedValue({ categoryCode: 'PVC' });
    prismaMock.productSkuSequence.upsert = jest
      .fn()
      .mockResolvedValue({ seq: 1 });

    const tx = {
      product: { create: jest.fn().mockResolvedValue({ id: 'prod-1' }) },
      productVariant: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]),
      },
      stock: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn(),
      },
    };

    prismaMock.$transaction = jest
      .fn()
      .mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg(tx);
        }
        return arg;
      });

    const result = await service.create(dto, 'tenant-1', 'branch-1');

    expect(result).toEqual({ id: 'prod-1' });
    expect(tx.product.create).toHaveBeenCalled();
    expect(tx.productVariant.createMany).toHaveBeenCalled();
    expect(tx.stock.createMany).toHaveBeenCalled();
  });

  it('throws duplicate barcode conflict', async () => {
    const dto: CreateProductDto = {
      name: 'PVC Pipe',
      category_id: 'cat-1',
      selling_price: 100,
      tax_category: TaxCategoryDto.standard_vat,
      has_variants: false,
    };

    prismaMock.category.findFirst = jest
      .fn()
      .mockResolvedValue({ categoryCode: 'PVC' });
    prismaMock.productSkuSequence.upsert = jest
      .fn()
      .mockResolvedValue({ seq: 1 });

    const error = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '7.4.2',
      meta: { target: ['barcode'] },
    });

    prismaMock.$transaction = jest.fn().mockRejectedValue(error);

    await expect(service.create(dto, 'tenant-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires tenant id', async () => {
    await expect(
      service.findAll({ tenantId: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll returns items with stock summary', async () => {
    prismaMock.$transaction = jest.fn().mockResolvedValue([
      [
        {
          id: 'prod-1',
          name: 'PVC',
          hasVariants: false,
          sellingPrice: new Prisma.Decimal(100),
          minimumStockLevel: new Prisma.Decimal(5),
          variants: [],
        },
      ],
      1,
      [
        {
          productId: 'prod-1',
          _sum: {
            quantity: new Prisma.Decimal(3),
            reservedQuantity: new Prisma.Decimal(1),
          },
        },
      ],
    ]);

    const result = await service.findAll({ tenantId: 'tenant-1' });

    expect(result.data[0].stock_summary.currentStock).toBe(3);
    expect(result.pagination.total).toBe(1);
  });

  it('findByBarcode uses cache when available', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ product: { id: 'prod-1' } }),
    );

    const result = await service.findByBarcode('tenant-1', '123');

    expect(result).toEqual({ product: { id: 'prod-1' } });
  });
});
