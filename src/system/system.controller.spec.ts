/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from './system.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('SystemController', () => {
  let controller: SystemController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn().mockResolvedValue(undefined),
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = app.get<SystemController>(SystemController);
    prisma = app.get<PrismaService>(PrismaService);
  });

  describe('healthCheck', () => {
    it('should return status UP when DB is healthy', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'UP',
        timestamp: expect.any(String),
      });
    });

    it('should throw ServiceUnavailableException when DB fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(controller.healthCheck()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return status DOWN in exception response when DB fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB Error'));

      try {
        await controller.healthCheck();
        fail('Should have thrown ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const response = (error as ServiceUnavailableException).getResponse();
        expect(response).toMatchObject({
          status: 'DOWN',
          timestamp: expect.any(String),
        });
      }
    });
  });
});
