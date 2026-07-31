'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { TagWithCount } from '@/lib/types';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const DAYS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

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

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jumpValue, setJumpValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Debounce the search box - reset to page 1 whenever the committed search
  // term actually changes, same pattern as the article editor's tag picker.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ take: String(pageSize), skip: String((page - 1) * pageSize) });
    if (search) qs.set('search', search);
    if (days) qs.set('days', days);
    apiFetch<{ items: TagWithCount[]; total: number }>(`/tags/stats?${qs}`)
      .then((res) => {
        setTags(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load tags'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [search, days, page, pageSize]);

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

  function goToPage(target: number) {
    setPage(Math.min(Math.max(target, 1), totalPages));
  }

  function handleJump(e: FormEvent) {
    e.preventDefault();
    const target = Number(jumpValue);
    if (Number.isFinite(target) && target >= 1) goToPage(Math.trunc(target));
    setJumpValue('');
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

      <div className="toolbar">
        <input
          placeholder="Search tags…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            setPage(1);
          }}
        >
          {DAYS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
        ) : tags.length === 0 ? (
          <p className="empty-state">No tags found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Article count</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="hint-text">{t.slug}</td>
                  <td>{t.articleCount}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && tags.length > 0 && (
        <div className="pagination-bar">
          <p className="hint-text" style={{ margin: 0 }}>
            Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + tags.length} of {total}
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
