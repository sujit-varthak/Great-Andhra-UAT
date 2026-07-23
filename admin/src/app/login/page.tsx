'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 2FA temporarily disabled for demo purposes — restore this block to
      // send the user through /2fa-setup or /login-2fa again.
      // const res = await apiFetch<{
      //   requiresTwoFactor?: boolean;
      //   requiresTwoFactorSetup?: boolean;
      //   preAuthToken: string;
      // }>('/auth/login', { method: 'POST', body: { email, password } });
      //
      // sessionStorage.setItem('preAuthToken', res.preAuthToken);
      //
      // if (res.requiresTwoFactorSetup) {
      //   router.push('/2fa-setup');
      // } else {
      //   router.push('/login-2fa');
      // }

      await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="auth-card">
        <h1>GreatAndhra Admin</h1>
        <p className="subtitle">Sign in to the editorial CMS</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <p className="hint-text">
          Invited but haven&apos;t set a password yet? Use the invite link you were sent.
        </p>
      </div>
    </div>
  );
}
