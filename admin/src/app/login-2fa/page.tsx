'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';

export default function LoginTwoFactorPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('preAuthToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setPreAuthToken(token);
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/login/2fa', {
        method: 'POST',
        body: { code },
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });
      sessionStorage.removeItem('preAuthToken');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="auth-card">
        <h1>Two-factor authentication</h1>
        <p className="subtitle">Enter the 6-digit code from your authenticator app</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="code">Authentication code</label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
