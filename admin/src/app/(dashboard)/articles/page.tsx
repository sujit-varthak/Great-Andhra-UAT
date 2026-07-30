'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { ArticleListItem, ArticleStatus } from '@/lib/types';

const STATUS_OPTIONS: ArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];
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

export default function ArticlesListPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jumpValue, setJumpValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ take: String(pageSize), skip: String((page - 1) * pageSize) });
    if (statusFilter) qs.set('status', statusFilter);
    apiFetch<{ items: ArticleListItem[]; total: number }>(`/articles?${qs}`)
      .then((res) => {
        setArticles(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load articles'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter, page, pageSize]);

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

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    try {
      await apiFetch(`/articles/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete article');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Articles</h1>
        <Link href="/articles/new" className="btn btn-primary">
          New Article
        </Link>
      </div>

      <div className="toolbar">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
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
        ) : articles.length === 0 ? (
          <p className="empty-state">No articles yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Views</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/articles/${a.id}`}>{a.title}</Link>
                  </td>
                  <td>{a.category?.name ?? '—'}</td>
                  <td>
                    <span className={`badge badge-${a.status.toLowerCase()}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{a.viewCount}</td>
                  <td>{new Date(a.updatedAt).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDelete(a.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && articles.length > 0 && (
        <div className="pagination-bar">
          <p className="hint-text" style={{ margin: 0 }}>
            Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + articles.length} of {total}
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
