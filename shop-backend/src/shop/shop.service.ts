import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterShopDto } from './dto/register-shop.dto';

@Injectable()
export class ShopService {
	constructor(private readonly prisma: PrismaService) {}

	async registerShop(data: RegisterShopDto) {
// Use transaction to ensure data consistency when creating user, shop, and subscription
		return this.prisma.$transaction(async (tx) => {
		// Validate unique email
		const existingUser = await tx.user.findUnique({
			where: { email: data.owner.email },
		});

		if (existingUser) {
			throw new ConflictException('Email already exists');
		}

		// Validate unique registration number
			const existingShop = await tx.shop.findUnique({
				where: { registration_number: data.shop.registration_number },
			});

			if (existingShop) {
				throw new ConflictException('Registration number already exists');
			}

			// Hash password with bcrypt (10 rounds) before storing
		const hashedPassword = await bcrypt.hash(data.owner.password, 10);

			const newUser = await tx.user.create({
				data: {
					...data.owner,
					password: hashedPassword,
					shop: {
						create: {
							...data.shop,
							subscription: {
								create: {
									plan: data.subscription_plan,
								},
							},
						},
					},
				},
				include: { shop: { include: { subscription: true } } },
			});

			return {
				message: 'Owner and Shop created successfully',
				userId: newUser.id,
				shopId: newUser.shop!.id,
			};
		});
	}
}
