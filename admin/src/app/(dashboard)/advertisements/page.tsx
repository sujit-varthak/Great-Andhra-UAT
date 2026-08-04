'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { AdvertisementListItem, AdZone, AD_ZONE_LABELS } from '@/lib/types';

const AD_ZONES: AdZone[] = [
  'HOMEPAGE_SIDEBAR_LEFT',
  'HOMEPAGE_SIDEBAR_RIGHT',
  'HOMEPAGE_TOP_BANNER',
  'HOMEPAGE_SECTION_INLINE',
  'HOMEPAGE_MOBILE_BANNER',
  'INNER_SIDEBAR_LEFT',
  'INNER_SIDEBAR_RIGHT',
  'INNER_TOP_BANNER',
  'INNER_MOBILE_BANNER',
  'BOXOFFICE_SIDEBAR_LEFT',
  'BOXOFFICE_SIDEBAR_RIGHT',
  'BOXOFFICE_TOP_BANNER',
  'BOXOFFICE_MOBILE_BANNER',
  'ROADBLOCK',
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 25;

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

export default function AdvertisementsListPage() {
  const [ads, setAds] = useState<AdvertisementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jumpValue, setJumpValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ take: String(pageSize), skip: String((page - 1) * pageSize) });
    if (zoneFilter) qs.set('zone', zoneFilter);
    if (isActiveFilter) qs.set('isActive', isActiveFilter);
    apiFetch<{ items: AdvertisementListItem[]; total: number }>(`/advertisements?${qs}`)
      .then((res) => {
        setAds(res.items);
        setTotal(res.total);
        setSelectedIds([]);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load advertisements'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [zoneFilter, isActiveFilter, page, pageSize]);

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === ads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ads.map((a) => a.id));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this advertisement? This cannot be undone.')) return;
    try {
      await apiFetch(`/advertisements/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete advertisement');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} advertisement(s)? This cannot be undone.`))
      return;

    try {
      await apiFetch('/advertisements/bulk-delete', {
        method: 'POST',
        body: { ids: selectedIds },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete advertisements');
    }
  }

  async function handleBulkToggle(isActive: boolean) {
    if (selectedIds.length === 0) return;

    try {
      await apiFetch('/advertisements/bulk-update-active', {
        method: 'PATCH',
        body: { ids: selectedIds, isActive },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update advertisements');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Advertisements</h1>
        <Link href="/advertisements/new" className="btn btn-primary">
          New Advertisement
        </Link>
      </div>

      <div className="toolbar">
        <select
          value={zoneFilter}
          onChange={(e) => {
            setZoneFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All zones</option>
          {AD_ZONES.map((z) => (
            <option key={z} value={z}>
              {AD_ZONE_LABELS[z]}
            </option>
          ))}
        </select>

        <select
          value={isActiveFilter}
          onChange={(e) => {
            setIsActiveFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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

      {selectedIds.length > 0 && (
        <div className="toolbar" style={{ backgroundColor: '#f0f0f0', padding: '0.75rem 1rem' }}>
          <span>{selectedIds.length} selected</span>
          <button
            onClick={() => handleBulkToggle(true)}
            className="btn btn-sm"
            disabled={loading}
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            className="btn btn-sm"
            disabled={loading}
          >
            Deactivate
          </button>
          <button
            onClick={handleBulkDelete}
            className="btn btn-sm btn-danger"
            disabled={loading}
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="btn btn-sm"
            disabled={loading}
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : ads.length === 0 ? (
          <p className="empty-state">No advertisements yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === ads.length && ads.length > 0}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < ads.length;
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Zone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                  </td>
                  <td>
                    <Link href={`/advertisements/${a.id}`}>{a.name}</Link>
                  </td>
                  <td>{AD_ZONE_LABELS[a.zone]}</td>
                  <td>
                    <span className="badge">{a.type}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${a.isActive ? 'published' : 'draft'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(a.startDate).toLocaleDateString()}</td>
                  <td>{a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="btn btn-sm btn-danger"
                      disabled={loading}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="toolbar">
          <button onClick={() => goToPage(page - 1)} disabled={page === 1 || loading}>
            ← Previous
          </button>

          {getPageNumbers(page, totalPages).map((p) => (
            <button
              key={p}
              onClick={() => typeof p === 'number' && goToPage(p)}
              disabled={p === 'ellipsis' || p === page || loading}
              style={p === page ? { fontWeight: 'bold', backgroundColor: '#007bff', color: 'white' } : {}}
            >
              {p === 'ellipsis' ? '…' : p}
            </button>
          ))}

          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages || loading}>
            Next →
          </button>

          <form onSubmit={handleJump} style={{ marginLeft: 'auto' }}>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder="Jump to page…"
              disabled={loading}
              style={{ width: '120px' }}
            />
          </form>
        </div>
      )}
    </div>
  );
}
