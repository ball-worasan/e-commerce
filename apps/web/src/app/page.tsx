'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMoney, type Product } from '../lib/store';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('Loading products…');

  useEffect(() => {
    fetch('/api/store/products').then(async (response) => {
      if (!response.ok) throw new Error();
      const result: Product[] = await response.json();
      setProducts(result.filter((product) => product.active));
      setMessage(result.length ? '' : 'No products are available yet.');
    }).catch(() => setMessage('Products are temporarily unavailable.'));
  }, []);

  return <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
    <h1>Products</h1>
    <nav><Link href="/cart">Cart</Link> · <Link href="/orders">Orders</Link> · <Link href="/account">Account</Link></nav>
    {message && <p role="status">{message}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {products.map((product) => <article key={product.id} style={{ border: '1px solid #ccc', padding: '1rem' }}>
        <h2><Link href={`/products/${product.id}`}>{product.name}</Link></h2>
        <p>{formatMoney(product.priceMinor, product.currency)}</p>
        <p>{product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Out of stock'}</p>
      </article>)}
    </div>
  </main>;
}
