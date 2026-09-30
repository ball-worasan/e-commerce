import React from 'react';
import { render, screen } from '@testing-library/react';
import Page from '../src/app/page';

describe('Page', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('renders products from the API with price and availability', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{
      id: '7f0a3b37-0736-4c74-976d-d9ea1c04c4af', name: 'Test product',
      priceMinor: 1250, currency: 'USD', stockQuantity: 2, active: true,
    }] }) as jest.Mock;
    render(<Page />);
    expect(await screen.findByText('Test product')).toBeTruthy();
    expect(screen.getByText('2 available')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith('/api/store/products');
  });
});
