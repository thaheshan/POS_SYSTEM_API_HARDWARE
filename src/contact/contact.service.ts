import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactStatus } from '@prisma/client';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto) {
    this.logger.log('Creating new contact message');
    return this.prisma.contactMessage.create({
      data: createContactDto,
    });
  }

  async findAll() {
    this.logger.log('Fetching all contact messages');
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: ContactStatus) {
    this.logger.log(`Updating status for message ${id} to ${status}`);
    
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return this.prisma.contactMessage.update({
      where: { id },
      data: { status },
    });
  }
}
