'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { formatMoney, storeRequest, type Cart, type CartItem, type Order } from '../../lib/store';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState('Loading cart…');

  useEffect(() => {
    const cartId = window.localStorage.getItem('ecommerce_cart_id');
    if (!cartId) { setMessage('Your cart is empty.'); return; }
    storeRequest<Cart>(`cart/${cartId}`).then((result) => { setCart(result); setMessage(''); })
      .catch((error) => {
        if (error instanceof Error && error.message === 'SIGN_IN_REQUIRED') router.replace('/login');
        else { window.localStorage.removeItem('ecommerce_cart_id'); setMessage('Your cart is empty.'); }
      });
  }, [router]);

  async function change(itemId: string, quantity: number) {
    if (!cart) return;
    try {
      const result = quantity === 0
        ? await storeRequest<Cart>(`cart/${cart.id}/items/${itemId}`, 'DELETE', {})
        : await storeRequest<Cart>(`cart/${cart.id}/items/${itemId}`, 'PATCH', { quantity });
      setCart(result); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update cart'); }
  }

  async function checkout() {
    if (!cart) return;
    try {
      const order = await storeRequest<Order>('orders', 'POST', { cartId: cart.id });
      window.localStorage.removeItem('ecommerce_cart_id');
      router.push(`/orders/${order.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create order'); }
  }

  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
    <h1>Cart</h1><Link href="/">Continue shopping</Link>
    {cart?.items.map((item) => <article key={item.id} style={{ borderBottom: '1px solid #ccc', padding: '1rem 0' }}>
      <h2>{item.name}</h2><p>{formatMoney(item.unitPriceMinor, item.currency)} each</p>
      <CartItemEditor item={item} onChange={(quantity) => change(item.id, quantity)} />
    </article>)}
    {cart?.items.length ? <><p>Total: {formatMoney(cart.totalMinor, cart.currency ?? 'THB')}</p>
      <button onClick={checkout}>Create order</button><p>Payment is not collected here.</p></> : null}
    {message && <p role="status">{message}</p>}
  </main>;
}

function CartItemEditor({ item, onChange }: { item: CartItem; onChange: (quantity: number) => Promise<void> }) {
  const [quantity, setQuantity] = useState(item.quantity);
  useEffect(() => setQuantity(item.quantity), [item.quantity]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 100) void onChange(quantity);
  }
  return <form onSubmit={submit}>
    <label htmlFor={`quantity-${item.id}`}>Quantity</label>{' '}
    <input id={`quantity-${item.id}`} type="number" min={1} max={100} value={quantity}
      onChange={(event) => setQuantity(Number(event.target.value))} />{' '}
    <button type="submit" disabled={!Number.isInteger(quantity) || quantity < 1 || quantity > 100}>Update</button>{' '}
    <button type="button" onClick={() => void onChange(0)}>Remove</button>
  </form>;
}
