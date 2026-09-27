import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './products.dto';

const valid = { sku: 'sku-1', name: 'Test product', priceMinor: 1200, currency: 'THB', stockQuantity: 4 };

describe('product input', () => {
  it('accepts a valid product', async () => {
    expect(await validate(plainToInstance(CreateProductDto, valid))).toHaveLength(0);
  });

  it.each([
    { priceMinor: -1 }, { stockQuantity: -1 }, { sku: 'bad sku' }, { currency: 'thb' }, { name: '' },
  ])('rejects invalid values %j', async (patch) => {
    expect((await validate(plainToInstance(CreateProductDto, { ...valid, ...patch }))).length).toBeGreaterThan(0);
  });
});
