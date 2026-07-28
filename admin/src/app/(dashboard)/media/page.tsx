'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { MediaLibraryItem } from '@/lib/types';

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MediaLibraryItem[]>('/media/library')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Media Library</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No uploaded images yet.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {items.map((item) => (
              <div key={item.id} className="card" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.featuredImageUrl}
                  alt={item.title}
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6 }}
                />
                <p style={{ margin: '8px 0 4px', fontSize: 13 }}>
                  Used in:{' '}
                  <Link href={`/articles/${item.id}`}>{item.title}</Link>
                </p>
                <p className="hint-text" style={{ margin: 0 }}>
                  {item.status} · {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
