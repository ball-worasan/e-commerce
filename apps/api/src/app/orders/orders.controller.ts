import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { DevWriteGuard } from '../common/dev-write.guard';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(DevWriteGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() input: CreateOrderDto) { return this.orders.create(input); }

  @Get()
  list() { return this.orders.list(); }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.orders.get(id); }
}
