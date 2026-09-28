import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { DevWriteGuard } from '../common/dev-write.guard';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() { return this.products.list(); }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.products.get(id); }

  @Post()
  @UseGuards(DevWriteGuard)
  create(@Body() input: CreateProductDto) { return this.products.create(input); }

  @Patch(':id')
  @UseGuards(DevWriteGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateProductDto) {
    return this.products.update(id, input);
  }
}
