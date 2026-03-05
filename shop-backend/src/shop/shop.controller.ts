import { Body, Controller, Post } from '@nestjs/common';
import { RegisterShopDto } from './dto/register-shop.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
	constructor(private readonly shopService: ShopService) {}

	@Post('register')
	registerShop(@Body() body: RegisterShopDto) {
		return this.shopService.registerShop(body);
	}
}
