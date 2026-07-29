'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArticleStatus } from '@/lib/types';

const STATUSES: ArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];

export default function DashboardHomePage() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    apiFetch<Record<string, number>>('/articles/stats')
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="card">
        <p style={{ margin: 0 }}>
          Welcome to the GreatAndhra editorial admin panel. Use the sidebar to manage articles and
          site widgets, or jump straight to <Link href="/articles/new">writing a new article</Link>.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        {STATUSES.map((status) => (
          <div key={status} className="card" style={{ marginBottom: 0 }}>
            <div className="spinner-text">{status.replace('_', ' ')}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {counts ? counts[status] : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
