import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() input: CreateOrderDto, @Req() request: AuthenticatedRequest) { return this.orders.create(input, request.user.id); }

  @Get()
  list(@Req() request: AuthenticatedRequest) { return this.orders.list(request.user.id); }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) { return this.orders.get(id, request.user.id); }
}
