import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopsService } from './shops.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';
import { UpdateShopProfileDto } from './dto/update-shop-profile.dto';

describe('ShopController', () => {
  let controller: ShopController;
  let service: ShopsService;

  const mockShopsService = {
    getShopProfile: jest.fn(),
    updateShopProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        {
          provide: ShopsService,
          useValue: mockShopsService,
        },
      ],
    }).compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopsService>(ShopsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return shop profile for a valid tenant_id', async () => {
      const mockReq = {
        user: {
          tenant_id: 'shop_001',
          sub: 'user_001',
          email: 'owner@abc.com',
          role: 'OWNER',
        },
      } as unknown as AuthRequest;

      const mockShopProfile = {
        shop_id: 'shop_001',
        name: 'ABC Hardware Store',
        logo_url: 'https://cdn.shop.lk/logo.png',
        business_registration_no: 'BR-2024-001234',
        phone: '+94112345678',
        email: 'info@abchardware.lk',
        address: '123 Galle Road, Dehiwala',
        city: 'Dehiwala',
        district: 'Colombo',
        province: 'Western',
      };

      mockShopsService.getShopProfile.mockResolvedValue(mockShopProfile);

      const result = await controller.getProfile(mockReq);
      expect(result).toEqual(mockShopProfile);
      expect(service.getShopProfile).toHaveBeenCalledWith('shop_001');
    });

    it('should throw BadRequestException if tenant_id is missing', async () => {
      const mockReq = {
        user: {},
      } as unknown as AuthRequest;

      await expect(controller.getProfile(mockReq)).rejects.toThrow(BadRequestException);
    });

    it('should bubble up NotFoundException if shop is not found', async () => {
      const mockReq = {
        user: {
          tenant_id: 'non_existent',
        },
      } as unknown as AuthRequest;

      mockShopsService.getShopProfile.mockRejectedValue(new NotFoundException('Shop profile not found'));

      await expect(controller.getProfile(mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should successfully update and return status', async () => {
      const mockReq = {
        user: {
          tenant_id: 'shop_001',
          sub: 'user_001',
        },
      } as unknown as AuthRequest;

      const mockDto: UpdateShopProfileDto = {
        name: 'Updated Shop Name',
        business_registration_no: 'BR-999',
        phone: '+94771234567',
        email: 'new@shop.com',
      };

      const mockResponse = {
        message: 'Shop profile updated successfully',
        shop_id: 'shop_001',
        updated_at: '2026-06-08T10:30:00Z',
      };

      mockShopsService.updateShopProfile.mockResolvedValue(mockResponse);

      const result = await controller.updateProfile(mockReq, mockDto);
      expect(result).toEqual(mockResponse);
      expect(service.updateShopProfile).toHaveBeenCalledWith('shop_001', 'user_001', mockDto);
    });

    it('should throw BadRequestException if tenant_id or sub is missing', async () => {
      const mockReq = {
        user: {},
      } as unknown as AuthRequest;

      const mockDto: UpdateShopProfileDto = { name: 'Test' };

      await expect(controller.updateProfile(mockReq, mockDto)).rejects.toThrow(BadRequestException);
    });

    it('should bubble up ConflictException from service', async () => {
      const mockReq = {
        user: {
          tenant_id: 'shop_001',
          sub: 'user_001',
        },
      } as unknown as AuthRequest;

      const mockDto: UpdateShopProfileDto = {
        name: 'Duplicate Shop',
        business_registration_no: 'BR-EXISTS',
      };

      mockShopsService.updateShopProfile.mockRejectedValue(new ConflictException('Business registration number already exists'));

      await expect(controller.updateProfile(mockReq, mockDto)).rejects.toThrow(ConflictException);
    });
  });
});

