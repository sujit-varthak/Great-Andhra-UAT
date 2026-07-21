'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { AdminUser, Role } from '@/lib/types';

const ROLES: Role[] = ['ADMIN', 'EDITOR', 'AUTHOR', 'MODERATOR'];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('AUTHOR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');

  function load() {
    setLoading(true);
    apiFetch<AdminUser[]>('/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInviteLink('');
    try {
      const res = await apiFetch<{ userId: string; inviteToken: string }>('/users/invite', {
        method: 'POST',
        body: { email, name, role },
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/accept-invite?token=${res.inviteToken}`);
      setEmail('');
      setName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to invite user');
    }
  }

  async function handleRoleChange(user: AdminUser, newRole: Role) {
    try {
      await apiFetch(`/users/${user.id}/role`, { method: 'PATCH', body: { role: newRole } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update role');
    }
  }

  async function handleDisable(id: string) {
    if (!window.confirm('Disable this user and revoke their sessions?')) return;
    try {
      await apiFetch(`/users/${id}/disable`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable user');
    }
  }

  async function handleRevokeSessions(id: string) {
    try {
      await apiFetch(`/users/${id}/revoke-sessions`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke sessions');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Users &amp; Roles</h1>
      </div>

      <div className="card">
        <form onSubmit={handleInvite} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Invite
          </button>
        </form>
        {inviteLink && (
          <p className="hint-text" style={{ wordBreak: 'break-all' }}>
            Invite created — no mailer is configured, so share this link with the invitee directly:{' '}
            <code>{inviteLink}</code>
          </p>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value as Role)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {u.status}
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? ' (locked)' : ''}
                  </td>
                  <td>{u.totpEnabled ? 'Enabled' : 'Not enrolled'}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => handleRevokeSessions(u.id)}>
                      Revoke sessions
                    </button>
                    {u.status !== 'DISABLED' && (
                      <button className="btn btn-danger" onClick={() => handleDisable(u.id)}>
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
