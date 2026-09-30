'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'ecommerce-web' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) { setError(response.status === 503 ? 'Service temporarily unavailable' : 'Invalid email or password'); return; }
      router.replace('/account');
    } catch { setError('Service temporarily unavailable'); }
    finally { setBusy(false); }
  }

  return <main className={styles.boxContainer}><div className={styles.box}>
    <h1>Log in</h1>
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
    </form>
    <p>New here? <Link href="/register">Create an account</Link></p>
  </div></main>;
}
