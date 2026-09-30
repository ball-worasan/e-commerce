'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMoney, storeRequest, type Order } from '../../../lib/store';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('Loading order…');
  useEffect(() => {
    storeRequest<Order>(`orders/${id}`).then((result) => { setOrder(result); setMessage(''); })
      .catch((error) => {
        if (error instanceof Error && error.message === 'SIGN_IN_REQUIRED') router.replace('/login');
        else setMessage('Order unavailable.');
      });
  }, [id, router]);
  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
    <Link href="/orders">← Orders</Link>
    {order ? <><h1>Order {order.id.slice(0, 8)}</h1><p>Status: {order.status}</p>
      <ul>{order.items?.map((item) => <li key={item.id}>{item.name} × {item.quantity} — {formatMoney(item.lineTotalMinor, order.currency)}</li>)}</ul>
      <p>Total: {formatMoney(order.totalMinor, order.currency)}</p><p>Payment has not been collected.</p>
    </> : null}
    {message && <p role="status">{message}</p>}
  </main>;
}
