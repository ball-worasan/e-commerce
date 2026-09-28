import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { DevWriteGuard } from '../common/dev-write.guard';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(DevWriteGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Post()
  create() { return this.carts.create(); }

  @Get(':cartId')
  get(@Param('cartId', ParseUUIDPipe) cartId: string) { return this.carts.get(cartId); }

  @Post(':cartId/items')
  add(@Param('cartId', ParseUUIDPipe) cartId: string, @Body() input: AddCartItemDto) {
    return this.carts.add(cartId, input);
  }

  @Patch(':cartId/items/:itemId')
  update(@Param('cartId', ParseUUIDPipe) cartId: string, @Param('itemId', ParseUUIDPipe) itemId: string, @Body() input: UpdateCartItemDto) {
    return this.carts.update(cartId, itemId, input);
  }

  @Delete(':cartId/items/:itemId')
  remove(@Param('cartId', ParseUUIDPipe) cartId: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.carts.remove(cartId, itemId);
  }
}
