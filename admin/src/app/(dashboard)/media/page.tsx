'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { MediaLibraryItem } from '@/lib/types';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;

function getPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jumpValue, setJumpValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ take: String(pageSize), skip: String((page - 1) * pageSize) });
    apiFetch<{ items: MediaLibraryItem[]; total: number }>(`/media/library?${qs}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  function goToPage(target: number) {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    setPage(clamped);
  }

  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(jumpValue);
    if (Number.isFinite(target) && target >= 1) goToPage(Math.trunc(target));
    setJumpValue('');
  }

  return (
    <div>
      <div className="page-header">
        <h1>Media Library</h1>
      </div>

      <div className="toolbar">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
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

      {!loading && items.length > 0 && (
        <div className="pagination-bar">
          <p className="hint-text" style={{ margin: 0 }}>
            Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + items.length} of {total}
          </p>

          <div className="pagination">
            <button className="btn" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              Prev
            </button>

            {getPageNumbers(page, totalPages).map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="pagination-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`btn page-btn${p === page ? ' active' : ''}`}
                  onClick={() => goToPage(p)}
                  disabled={p === page}
                >
                  {p}
                </button>
              ),
            )}

            <button className="btn" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
              Next
            </button>

            <form className="pagination-jump" onSubmit={handleJump}>
              <span className="hint-text">Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder={String(page)}
              />
              <button type="submit" className="btn">
                Go
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
