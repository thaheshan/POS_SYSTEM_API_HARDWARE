import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SelectPlanDto } from './dto/select-plan.dto';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscription')
export class SubscriptionController {
	constructor(private readonly subscriptionService: SubscriptionService) {}

	@Post('select-plan')
	@UseGuards(JwtAuthGuard)
	selectPlan(@Body() body: SelectPlanDto, @Req() req: any) {
		return this.subscriptionService.selectPlan(req.user.id, body);
	}

	@Post('payment-method')
	@UseGuards(JwtAuthGuard)
	paymentMethod(@Body() body: PaymentMethodDto, @Req() req: any) {
		return this.subscriptionService.savePaymentMethod(req.user.id, body);
	}

	@Post('process-payment')
	@UseGuards(JwtAuthGuard)
	processPayment(@Body() body: ProcessPaymentDto, @Req() req: any) {
		return this.subscriptionService.processPayment(req.user.id, body);
	}
}
