'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';

export default function TwoFactorSetupPage() {
  const [preAuthToken, setPreAuthToken] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('preAuthToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setPreAuthToken(token);

    apiFetch<{ qrCodeDataUrl: string; secret: string }>('/auth/2fa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setQrCodeDataUrl(res.qrCodeDataUrl);
        setSecret(res.secret);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not start 2FA setup'));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/2fa/confirm', {
        method: 'POST',
        body: { code },
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });
      sessionStorage.removeItem('preAuthToken');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="auth-card">
        <h1>Set up two-factor authentication</h1>
        <p className="subtitle">Mandatory for every admin/editor account.</p>

        {qrCodeDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="Scan this QR code with your authenticator app"
              style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto 16px', borderRadius: 6 }}
            />
            <p className="hint-text" style={{ wordBreak: 'break-all', marginBottom: 16 }}>
              Can&apos;t scan? Enter this key manually: <code>{secret}</code>
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="code">Enter the 6-digit code to confirm</label>
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
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Confirming…' : 'Enable 2FA & continue'}
              </button>
            </form>
          </>
        ) : (
          error ? <p className="error-text">{error}</p> : <p className="spinner-text">Loading…</p>
        )}
      </div>
    </div>
  );
}
