'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { DontMissItem } from '@/lib/types';
import { ImageUploader } from '@/components/ImageUploader';

export default function DontMissPage() {
  const [items, setItems] = useState<DontMissItem[]>([]);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<DontMissItem[]>('/dont-miss')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/dont-miss', {
        method: 'POST',
        body: { title, linkUrl, imageUrl: imageUrl || undefined },
      });
      setTitle('');
      setLinkUrl('');
      setImageUrl(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    }
  }

  async function toggleActive(item: DontMissItem) {
    try {
      await apiFetch(`/dont-miss/${item.id}`, { method: 'PATCH', body: { isActive: !item.isActive } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this Don't Miss item?")) return;
    try {
      await apiFetch(`/dont-miss/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Don&apos;t Miss</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="linkUrl">Link URL</label>
              <input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required />
            </div>
          </div>
          <ImageUploader value={imageUrl} onChange={setImageUrl} />
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
          <p className="empty-state">No items yet.</p>
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
