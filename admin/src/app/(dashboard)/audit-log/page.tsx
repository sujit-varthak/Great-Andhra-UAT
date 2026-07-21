'use client';

import { Fragment, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { AuditLogItem } from '@/lib/types';

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [entity, setEntity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const qs = entity ? `?entity=${entity}` : '';
    apiFetch<{ items: AuditLogItem[]; total: number }>(`/audit-logs${qs}`)
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [entity]);

  const entities = ['Article', 'Category', 'Tag', 'User', 'FlashNews', 'TrendingLink', 'DontMiss', 'EpaperImage', 'Rating', 'MediaUpload'];

  return (
    <div>
      <div className="page-header">
        <h1>Audit Log</h1>
      </div>

      <div className="toolbar">
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No audit log entries.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>{item.actor ? `${item.actor.name} (${item.actor.email})` : 'System'}</td>
                    <td>{item.action}</td>
                    <td>{item.entity}</td>
                    <td>
                      <button
                        className="btn"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      >
                        {expanded === item.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr>
                      <td colSpan={5}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', margin: 0 }}>
                          {JSON.stringify({ before: item.beforeJson, after: item.afterJson }, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
