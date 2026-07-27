import { Test, TestingModule } from '@nestjs/testing';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';
import { UpdateVatRateDto } from './dto/update-vat-rate.dto';
import { UpdateTinNumberDto } from './dto/update-tin-number.dto';
import { UpdateVatNumberDto } from './dto/update-vat-number.dto';

describe('TaxController', () => {
  let controller: TaxController;
  let service: TaxService;

  const mockTaxService = {
    getTaxConfig: jest.fn(),
    updateVatRate: jest.fn(),
    updateTinNumber: jest.fn(),
    updateVatNumber: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxController],
      providers: [
        {
          provide: TaxService,
          useValue: mockTaxService,
        },
      ],
    }).compile();

    controller = module.get<TaxController>(TaxController);
    service = module.get<TaxService>(TaxService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POS-SET-05: GET /tax/config ──────────────────────────────────────────
  describe('getTaxConfig', () => {
    it('should return tax config for a valid tenant_id', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      const mockResponse = {
        vat_rate: 18,
        tin_number: 'TAX-ABC-123456',
        vat_number: 'VAT-LK-987654',
        is_ird_compliant: true,
        last_updated: '2026-06-08T10:00:00Z',
      };
      mockTaxService.getTaxConfig.mockResolvedValue(mockResponse);

      const result = await controller.getTaxConfig(mockReq);
      expect(result).toEqual(mockResponse);
      expect(service.getTaxConfig).toHaveBeenCalledWith('shop_001');
    });

    it('should throw BadRequestException if tenant_id is missing', async () => {
      const mockReq = { user: {} } as unknown as AuthRequest;
      await expect(controller.getTaxConfig(mockReq)).rejects.toThrow(BadRequestException);
    });

    it('should bubble up NotFoundException if no tax config found', async () => {
      const mockReq = { user: { tenant_id: 'shop_999' } } as unknown as AuthRequest;
      mockTaxService.getTaxConfig.mockRejectedValue(new NotFoundException('Tax configuration not found'));
      await expect(controller.getTaxConfig(mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── POS-SET-06: PUT /tax/vat-rate ───────────────────────────────────────
  describe('updateVatRate', () => {
    it('should update VAT rate successfully', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      const dto: UpdateVatRateDto = { vat_rate: 18 };
      const mockResponse = { message: 'VAT rate updated successfully', vat_rate: 18, updated_at: '2026-06-08T10:00:00Z' };
      mockTaxService.updateVatRate.mockResolvedValue(mockResponse);

      const result = await controller.updateVatRate(mockReq, dto);
      expect(result).toEqual(mockResponse);
      expect(service.updateVatRate).toHaveBeenCalledWith('shop_001', 18);
    });

    it('should throw BadRequestException if tenant_id is missing', async () => {
      const mockReq = { user: {} } as unknown as AuthRequest;
      await expect(controller.updateVatRate(mockReq, { vat_rate: 18 })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POS-SET-07: PUT /tax/tin ────────────────────────────────────────────
  describe('updateTinNumber', () => {
    it('should update TIN number successfully', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      const dto: UpdateTinNumberDto = { tin_number: 'TAX-ABC-123456' };
      const mockResponse = { message: 'TIN number updated successfully', tin_number: 'TAX-ABC-123456', updated_at: '2026-06-08T10:05:00Z' };
      mockTaxService.updateTinNumber.mockResolvedValue(mockResponse);

      const result = await controller.updateTinNumber(mockReq, dto);
      expect(result).toEqual(mockResponse);
      expect(service.updateTinNumber).toHaveBeenCalledWith('shop_001', 'TAX-ABC-123456');
    });

    it('should throw BadRequestException if tenant_id is missing', async () => {
      const mockReq = { user: {} } as unknown as AuthRequest;
      await expect(controller.updateTinNumber(mockReq, { tin_number: 'TAX-ABC-123456' })).rejects.toThrow(BadRequestException);
    });

    it('should bubble up ConflictException for duplicate TIN', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      mockTaxService.updateTinNumber.mockRejectedValue(new ConflictException('TIN number already exists'));
      await expect(controller.updateTinNumber(mockReq, { tin_number: 'TAX-DUP-000000' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── POS-SET-08: PUT /tax/vat-number ─────────────────────────────────────
  describe('updateVatNumber', () => {
    it('should update VAT number successfully', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      const dto: UpdateVatNumberDto = { vat_number: 'VAT-LK-987654' };
      const mockResponse = { message: 'VAT number updated successfully', vat_number: 'VAT-LK-987654', updated_at: '2026-06-08T10:10:00Z' };
      mockTaxService.updateVatNumber.mockResolvedValue(mockResponse);

      const result = await controller.updateVatNumber(mockReq, dto);
      expect(result).toEqual(mockResponse);
      expect(service.updateVatNumber).toHaveBeenCalledWith('shop_001', 'VAT-LK-987654');
    });

    it('should throw BadRequestException if tenant_id is missing', async () => {
      const mockReq = { user: {} } as unknown as AuthRequest;
      await expect(controller.updateVatNumber(mockReq, { vat_number: 'VAT-LK-987654' })).rejects.toThrow(BadRequestException);
    });

    it('should bubble up ConflictException for duplicate VAT number', async () => {
      const mockReq = { user: { tenant_id: 'shop_001' } } as unknown as AuthRequest;
      mockTaxService.updateVatNumber.mockRejectedValue(new ConflictException('VAT number already exists'));
      await expect(controller.updateVatNumber(mockReq, { vat_number: 'VAT-DUP-000000' })).rejects.toThrow(ConflictException);
    });
  });
});
