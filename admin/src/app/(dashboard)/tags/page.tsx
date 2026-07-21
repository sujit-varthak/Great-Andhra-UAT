'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Tag } from '@/lib/types';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<Tag[]>('/tags')
      .then(setTags)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load tags'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/tags', { method: 'POST', body: { name } });
      setName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tag');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this tag?')) return;
    try {
      await apiFetch(`/tags/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete tag');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tags</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : tags.length === 0 ? (
          <p className="empty-state">No tags yet.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => (
              <span
                key={t.id}
                className="badge"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}
              >
                {t.name}
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
