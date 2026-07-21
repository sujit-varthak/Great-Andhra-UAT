'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Article, ArticleStatus } from '@/lib/types';

const STATUS_OPTIONS: ArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];

export default function ArticlesListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    apiFetch<Article[]>(`/articles${qs}`)
      .then(setArticles)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load articles'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
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
    </div>
  );
}
