export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  priceMinor: number;
  currency: string;
  stockQuantity: number;
  active: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalMinor: number;
  currency: string | null;
}

export interface Order {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  items?: CartItem[];
}

export function formatMoney(minor: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100); }
  catch { return `${(minor / 100).toFixed(2)} ${currency}`; }
}

export async function storeRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/store/${path}`, {
    method, headers: { 'content-type': 'application/json', 'x-requested-with': 'ecommerce-web' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) throw new Error('SIGN_IN_REQUIRED');
  if (!response.ok) throw new Error(response.status === 503 ? 'Store temporarily unavailable' : 'Request could not be completed');
  return response.json() as Promise<T>;
}
