import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './orders.dto';

describe('order input', () => {
  it('accepts only a cart UUID, never a client total', async () => {
    expect(await validate(plainToInstance(CreateOrderDto, { cartId: 'bad' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateOrderDto, { cartId: 'f579c05b-42ed-470d-a430-4c163953324b' }))).toHaveLength(0);
  });
});
