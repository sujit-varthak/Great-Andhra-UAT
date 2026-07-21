'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { EpaperImageItem } from '@/lib/types';
import { ImageUploader } from '@/components/ImageUploader';

export default function EpaperPage() {
  const [items, setItems] = useState<EpaperImageItem[]>([]);
  const [editionDate, setEditionDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<EpaperImageItem[]>('/epaper')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!imageUrl) {
      setError('Upload a page image first');
      return;
    }
    try {
      await apiFetch('/epaper', { method: 'POST', body: { editionDate, pageNumber, imageUrl } });
      setPageNumber((p) => p + 1);
      setImageUrl(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add page');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this e-paper page?')) return;
    try {
      await apiFetch(`/epaper/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete page');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>E-Paper</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="editionDate">Edition date</label>
              <input
                id="editionDate"
                type="date"
                value={editionDate}
                onChange={(e) => setEditionDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pageNumber">Page number</label>
              <input
                id="pageNumber"
                type="number"
                min={1}
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <ImageUploader value={imageUrl} onChange={setImageUrl} label="Page image" />
          <button type="submit" className="btn btn-primary">
            Add page
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No e-paper pages uploaded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Edition</th>
                <th>Page</th>
                <th>Image</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.editionDate).toLocaleDateString()}</td>
                  <td>{item.pageNumber}</td>
                  <td>
                    <a href={item.imageUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
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
