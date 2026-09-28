import { BadRequestException } from '@nestjs/common';
import { calculateTotal } from './totals';

describe('server-side totals', () => {
  it('uses product prices and quantities in minor units', () => {
    expect(calculateTotal([
      { unitPriceMinor: 1250, quantity: 2, currency: 'THB' },
      { unitPriceMinor: 500, quantity: 3, currency: 'THB' },
    ])).toEqual({ totalMinor: 4000, currency: 'THB' });
  });

  it('rejects mixed currency and overflowing totals', () => {
    expect(() => calculateTotal([
      { unitPriceMinor: 100, quantity: 1, currency: 'THB' },
      { unitPriceMinor: 100, quantity: 1, currency: 'USD' },
    ])).toThrow(BadRequestException);
    expect(() => calculateTotal([{ unitPriceMinor: 2_000_000_000, quantity: 2, currency: 'THB' }])).toThrow(BadRequestException);
  });
});
