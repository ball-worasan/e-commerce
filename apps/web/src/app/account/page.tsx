'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Account { id: string; email: string; role: string }

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState('Loading account…');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me').then(async (response) => {
      if (!active) return;
      if (response.status === 401) { router.replace('/login'); return; }
      if (!response.ok) { setMessage('Account service unavailable'); return; }
      setAccount(await response.json());
    }).catch(() => { if (active) setMessage('Account service unavailable'); });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'ecommerce-web' } });
    router.replace('/login');
  }

  return <main><h1>Account</h1>{account ? <><p>{account.email}</p><p>Role: {account.role}</p><button onClick={logout}>Log out</button></> : <p>{message}</p>}</main>;
}
