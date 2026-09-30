'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMoney, storeRequest, type Order } from '../../lib/store';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('Loading orders…');
  useEffect(() => {
    storeRequest<Order[]>('orders').then((result) => { setOrders(result); setMessage(result.length ? '' : 'No orders yet.'); })
      .catch((error) => {
        if (error instanceof Error && error.message === 'SIGN_IN_REQUIRED') router.replace('/login');
        else setMessage('Orders temporarily unavailable.');
      });
  }, [router]);

  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
    <h1>Orders</h1><Link href="/">Products</Link>
    {message && <p role="status">{message}</p>}
    {orders.map((order) => <article key={order.id} style={{ borderBottom: '1px solid #ccc', padding: '1rem 0' }}>
      <Link href={`/orders/${order.id}`}>Order {order.id.slice(0, 8)}</Link>
      <p>{order.status} · {formatMoney(order.totalMinor, order.currency)}</p>
    </article>)}
  </main>;
}
