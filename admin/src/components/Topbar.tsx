'use client';

import { useAuth } from '@/lib/auth-context';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <div className="topbar">
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && <span className="spinner-text">{user.email}</span>}
        <button className="btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
