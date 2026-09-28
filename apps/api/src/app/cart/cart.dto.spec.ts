import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

describe('cart input', () => {
  it('requires a product UUID and positive integer quantity', async () => {
    expect(await validate(plainToInstance(AddCartItemDto, { productId: 'not-a-uuid', quantity: 0 }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateCartItemDto, { quantity: 1.5 }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(AddCartItemDto, {
      productId: 'f579c05b-42ed-470d-a430-4c163953324b', quantity: 2,
    }))).toHaveLength(0);
  });
});
