'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'ecommerce-web' },
        body: JSON.stringify({ email, password }),
      });
      if (response.status === 409) { setError('Email already registered'); return; }
      if (!response.ok) { setError(response.status === 503 ? 'Service temporarily unavailable' : 'Please check your details'); return; }
      router.replace('/login');
    } catch { setError('Service temporarily unavailable'); }
    finally { setBusy(false); }
  }

  return <main className={styles.boxContainer}><div className={styles.box}>
    <h1>Create account</h1>
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
    </form>
    <p>Already have an account? <Link href="/login">Log in</Link></p>
  </div></main>;
}
