'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { FlashNewsItem } from '@/lib/types';

export default function FlashNewsPage() {
  const [items, setItems] = useState<FlashNewsItem[]>([]);
  const [headline, setHeadline] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<FlashNewsItem[]>('/flash-news')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/flash-news', {
        method: 'POST',
        body: { headline, linkUrl: linkUrl || undefined },
      });
      setHeadline('');
      setLinkUrl('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    }
  }

  async function toggleActive(item: FlashNewsItem) {
    try {
      await apiFetch(`/flash-news/${item.id}`, { method: 'PATCH', body: { isActive: !item.isActive } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this flash news item?')) return;
    try {
      await apiFetch(`/flash-news/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Flash News</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="headline">Headline</label>
            <input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="linkUrl">Link (optional)</label>
            <input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
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
          <p className="empty-state">No flash news items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Headline</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.linkUrl ? <a href={item.linkUrl} target="_blank" rel="noreferrer">{item.headline}</a> : item.headline}</td>
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
