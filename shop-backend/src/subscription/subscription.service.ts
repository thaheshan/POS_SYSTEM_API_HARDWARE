import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SelectPlanDto } from './dto/select-plan.dto';

@Injectable()
export class SubscriptionService {
	constructor(private readonly prisma: PrismaService) {}

	async selectPlan(userId: string, data: SelectPlanDto) {
		const shop = await this.prisma.shop.findUnique({
			where: { ownerId: userId },
			include: { subscription: true },
		});

		if (!shop) {
			throw new NotFoundException('Shop not found for this user');
		}

		const subscription = await this.prisma.subscription.upsert({
			where: { shopId: shop.id },
			update: { plan: data.plan, status: 'INACTIVE' },
			create: { shopId: shop.id, plan: data.plan },
		});

		return {
			message: 'Subscription plan selected',
			subscriptionId: subscription.id,
			plan: subscription.plan,
		};
	}

	async savePaymentMethod(userId: string, data: PaymentMethodDto) {
		const shop = await this.prisma.shop.findUnique({
			where: { ownerId: userId },
			include: { subscription: true },
		});

		if (!shop || !shop.subscription) {
			throw new NotFoundException('Active shop subscription not found');
		}

		if (!data.payment_method || !data.payment_method.trim()) {
			throw new BadRequestException('Invalid payment method');
		}

		if (!data.details) {
			throw new BadRequestException('Payment details are required');
		}

		// In production, you would tokenize and securely store card details
		// For now, we'll just validate and return success
		const paymentToken = 'token_' + Math.random().toString(36).substr(2, 9);

		await this.prisma.subscription.update({
			where: { id: shop.subscription.id },
			data: { payment_token: paymentToken },
		});

		return {
			message: 'Payment method saved successfully',
			paymentTokenId: paymentToken,
		};
	}

	async processPayment(userId: string, data: ProcessPaymentDto) {
		const shop = await this.prisma.shop.findUnique({
			where: { ownerId: userId },
			include: { subscription: true },
		});

		if (!shop || !shop.subscription) {
			throw new NotFoundException('Subscription not found');
		}

		if (!data.amount || data.amount <= 0) {
			throw new BadRequestException('Invalid payment amount');
		}

		if (!data.payment_method) {
			throw new BadRequestException('Payment method is required');
		}

		// In production, process payment through payment gateway
		// For now, simulate successful payment
		const updated = await this.prisma.subscription.update({
			where: { id: shop.subscription.id },
			data: { status: 'ACTIVE' },
		});

		return {
			message: 'Payment successful, account activated',
			subscriptionId: updated.id,
			status: updated.status,
		};
	}
}
