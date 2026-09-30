import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) { return this.carts.create(request.user.id); }

  @Get(':cartId')
  get(@Param('cartId', ParseUUIDPipe) cartId: string, @Req() request: AuthenticatedRequest) { return this.carts.get(cartId, request.user.id); }

  @Post(':cartId/items')
  add(@Param('cartId', ParseUUIDPipe) cartId: string, @Body() input: AddCartItemDto, @Req() request: AuthenticatedRequest) {
    return this.carts.add(cartId, input, request.user.id);
  }

  @Patch(':cartId/items/:itemId')
  update(@Param('cartId', ParseUUIDPipe) cartId: string, @Param('itemId', ParseUUIDPipe) itemId: string, @Body() input: UpdateCartItemDto, @Req() request: AuthenticatedRequest) {
    return this.carts.update(cartId, itemId, input, request.user.id);
  }

  @Delete(':cartId/items/:itemId')
  remove(@Param('cartId', ParseUUIDPipe) cartId: string, @Param('itemId', ParseUUIDPipe) itemId: string, @Req() request: AuthenticatedRequest) {
    return this.carts.remove(cartId, itemId, request.user.id);
  }
}
