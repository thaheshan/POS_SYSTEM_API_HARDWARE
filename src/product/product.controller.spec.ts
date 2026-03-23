import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDto, TaxCategoryDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductController', () => {
  let controller: ProductController;
  const createMock = jest.fn();
  const findAllMock = jest.fn();
  const findOneMock = jest.fn();
  const updateMock = jest.fn();
  const removeMock = jest.fn();
  const findByBarcodeMock = jest.fn();
  const findBySkuMock = jest.fn();

  const productServiceMock = {
    create: createMock,
    findAll: findAllMock,
    findOne: findOneMock,
    update: updateMock,
    remove: removeMock,
    findByBarcode: findByBarcodeMock,
    findBySku: findBySkuMock,
  } as unknown as ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create with tenant and branch', async () => {
    const dto: CreateProductDto = {
      name: 'PVC Pipe',
      category_id: 'cat-1',
      selling_price: 100,
      tax_category: TaxCategoryDto.standard_vat,
      has_variants: false,
    };
    createMock.mockResolvedValue({ id: 'prod-1' });

    await controller.create(dto, 'tenant-1', 'branch-1');

    expect(createMock).toHaveBeenCalledWith(dto, 'tenant-1', 'branch-1');
  });

  it('should call findAll with filters', async () => {
    findAllMock.mockResolvedValue({ data: [] });

    await controller.findAll(
      '1',
      '10',
      'cat-1',
      'brand-1',
      'standard_vat',
      'true',
      'pvc',
      'tenant-1',
    );

    expect(findAllMock).toHaveBeenCalledWith({
      page: '1',
      limit: '10',
      category: 'cat-1',
      brand: 'brand-1',
      taxCategory: 'standard_vat',
      lowStock: 'true',
      search: 'pvc',
      tenantId: 'tenant-1',
    });
  });

  it('should call findByBarcode', async () => {
    findByBarcodeMock.mockResolvedValue({});

    await controller.findByBarcode('123', 'tenant-1');

    expect(findByBarcodeMock).toHaveBeenCalledWith('tenant-1', '123');
  });

  it('should call findBySku', async () => {
    findBySkuMock.mockResolvedValue({});

    await controller.findBySku('SKU-1', 'tenant-1');

    expect(findBySkuMock).toHaveBeenCalledWith('tenant-1', 'SKU-1');
  });

  it('should call update', async () => {
    const dto: UpdateProductDto = { name: 'Updated' };
    updateMock.mockResolvedValue({ id: 'prod-1' });

    await controller.update('prod-1', dto, 'tenant-1');

    expect(updateMock).toHaveBeenCalledWith('prod-1', dto, 'tenant-1');
  });

  it('should call remove', async () => {
    removeMock.mockResolvedValue({ id: 'prod-1' });

    await controller.remove('prod-1', 'tenant-1');

    expect(removeMock).toHaveBeenCalledWith('prod-1', 'tenant-1');
  });
});
