'use client';

import { useState } from 'react';
import { WeeklyTopFiveManager } from '@/components/WeeklyTopFiveManager';
import { MovieBoxOfficeManager } from '@/components/MovieBoxOfficeManager';

const TABS = [
  { key: 'weekly', label: 'This Week Top 5' },
  { key: 'allTime', label: 'All Time Top Films' },
  { key: 'usa', label: 'USA Box Office' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function MovieRankingsPage() {
  const [tab, setTab] = useState<TabKey>('weekly');

  return (
    <div>
      <div className="page-header">
        <h1>Movie Rankings</h1>
      </div>

      <div className="field-row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'btn btn-primary' : 'btn'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && <WeeklyTopFiveManager />}
      {tab === 'allTime' && <MovieBoxOfficeManager section="ALL_TIME" />}
      {tab === 'usa' && <MovieBoxOfficeManager section="USA_BOX_OFFICE" />}
    </div>
  );
}
