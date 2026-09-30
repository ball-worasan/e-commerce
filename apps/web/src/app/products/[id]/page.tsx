'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMoney, storeRequest, type Cart, type Product } from '../../../lib/store';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('Loading product…');

  useEffect(() => {
    storeRequest<Product>(`products/${id}`).then((item) => { setProduct(item); setMessage(''); })
      .catch(() => setMessage('Product unavailable.'));
  }, [id]);

  async function addToCart() {
    if (!product) return;
    setMessage('Adding to cart…');
    try {
      let cartId = window.localStorage.getItem('ecommerce_cart_id');
      if (cartId) {
        try { await storeRequest<Cart>(`cart/${cartId}`); }
        catch { cartId = null; window.localStorage.removeItem('ecommerce_cart_id'); }
      }
      if (!cartId) {
        const cart = await storeRequest<Cart>('cart', 'POST', {});
        cartId = cart.id;
        window.localStorage.setItem('ecommerce_cart_id', cartId);
      }
      await storeRequest<Cart>(`cart/${cartId}/items`, 'POST', { productId: product.id, quantity });
      router.push('/cart');
    } catch (error) {
      if (error instanceof Error && error.message === 'SIGN_IN_REQUIRED') router.push('/login');
      else setMessage(error instanceof Error ? error.message : 'Could not add item');
    }
  }

  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
    <Link href="/">← Products</Link>
    {product ? <><h1>{product.name}</h1><p>{product.description}</p>
      <p>{formatMoney(product.priceMinor, product.currency)}</p>
      <p>{product.stockQuantity} available</p>
      <label htmlFor="quantity">Quantity</label>{' '}
      <input id="quantity" type="number" min={1} max={Math.min(product.stockQuantity, 100)} value={quantity}
        onChange={(event) => setQuantity(Number(event.target.value))} />{' '}
      <button onClick={addToCart} disabled={!product.active || product.stockQuantity < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stockQuantity}>Add to cart</button>
    </> : null}
    {message && <p role="status">{message}</p>}
  </main>;
}
