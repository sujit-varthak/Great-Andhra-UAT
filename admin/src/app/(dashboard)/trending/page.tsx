'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { TrendingItem } from '@/lib/types';

export default function TrendingPage() {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<TrendingItem[]>('/trending')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/trending', { method: 'POST', body: { title, linkUrl } });
      setTitle('');
      setLinkUrl('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    }
  }

  async function toggleActive(item: TrendingItem) {
    try {
      await apiFetch(`/trending/${item.id}`, { method: 'PATCH', body: { isActive: !item.isActive } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this trending link?')) return;
    try {
      await apiFetch(`/trending/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trending Links</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="linkUrl">Link URL</label>
            <input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required />
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
        ) : items.length === 0 ? (
          <p className="empty-state">No trending links yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <a href={item.linkUrl} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  </td>
                  <td>
                    <button className="btn" onClick={() => toggleActive(item)}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
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
