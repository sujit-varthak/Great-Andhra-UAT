'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import {
  AdvertisementListItem,
  AdZone,
  AdPage,
  AdDevice,
  AD_ZONE_LABELS,
  AD_ZONE_PAGE,
  AD_PAGE_LABELS,
  AD_ZONE_DEVICE,
} from '@/lib/types';

const AD_ZONES: AdZone[] = [
  'HOMEPAGE_SIDEBAR_LEFT',
  'HOMEPAGE_SIDEBAR_RIGHT',
  'HOMEPAGE_TOP_BANNER',
  'HOMEPAGE_MOBILE_BANNER',
  'HOMEPAGE_SECTION_INLINE',
  'HOMEPAGE_ABOVE_HEADER_BANNER',
  'HOMEPAGE_STRIP_BANNER_1',
  'HOMEPAGE_STRIP_BANNER_2',
  'HOMEPAGE_STRIP_BANNER_3',
  'HOMEPAGE_BIG_STORY_BANNER',
  'HOMEPAGE_LATEST_NEWS_INLINE_AD',
  'HOMEPAGE_OPINION_BANNER',
  'HOMEPAGE_ARTICLE_WIDGET_AD',
  'HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD',
  'INNER_SIDEBAR_LEFT',
  'INNER_SIDEBAR_RIGHT',
  'INNER_TOP_BANNER',
  'INNER_MOBILE_BANNER',
  'INNER_ARTICLE_BANNER',
  'INNER_ARTICLE_MIDCONTENT_AD',
  'INNER_SIDEBAR_BOTTOM_AD',
  'BOXOFFICE_SIDEBAR_LEFT',
  'BOXOFFICE_SIDEBAR_RIGHT',
  'BOXOFFICE_TOP_BANNER',
  'BOXOFFICE_MOBILE_BANNER',
  'BOXOFFICE_STICKY_AD',
  'BOXOFFICE_REVIEW_AD',
  'LISTPAGE_SIDEBAR_LEFT',
  'LISTPAGE_SIDEBAR_RIGHT',
  'LISTPAGE_CONTENT_AD',
  'LISTPAGE_TOP_BANNER',
  'LISTPAGE_MOBILE_BANNER',
  'ROADBLOCK',
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 25;

const PAGE_TABS: AdPage[] = ['home', 'inner', 'boxoffice', 'listpage'];
const DEVICE_TABS: AdDevice[] = ['desktop', 'mobile'];
const DEVICE_LABELS: Record<AdDevice, string> = { desktop: 'Desktop', mobile: 'Mobile', both: 'Both' };

function zonesForPage(page: AdPage): Array<Exclude<AdZone, 'ROADBLOCK'>> {
  return (Object.keys(AD_ZONE_PAGE) as Array<keyof typeof AD_ZONE_PAGE>).filter(
    (z) => AD_ZONE_PAGE[z] === page,
  );
}

// A zone tagged 'both' (no dedicated device counterpart) appears under either sub-tab.
function zonesForPageAndDevice(page: AdPage, device: AdDevice): Array<Exclude<AdZone, 'ROADBLOCK'>> {
  return zonesForPage(page).filter((z) => AD_ZONE_DEVICE[z] === device || AD_ZONE_DEVICE[z] === 'both');
}

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

const ALL_ZONES = 'all';
type ZoneSelection = AdZone | typeof ALL_ZONES;

// One page's zone browser: a Desktop/Mobile sub-tab scopes which zones are in play, then a
// dropdown (defaulting to "All <Page> Ads") lets the user narrow to one specific zone. Shows
// current ad(s) per zone (a zone can still hold more than one - they rotate on the live site),
// edit/delete, or jump to the create form with a zone pre-selected.
function PageZoneBrowser({
  page,
  device,
  onDeviceChange,
}: {
  page: AdPage;
  device: AdDevice;
  onDeviceChange: (device: AdDevice) => void;
}) {
  const zones = zonesForPageAndDevice(page, device);
  const [selectedZone, setSelectedZone] = useState<ZoneSelection>(ALL_ZONES);
  const [ads, setAds] = useState<AdvertisementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    const zoneParam = selectedZone === ALL_ZONES ? zones.join(',') : selectedZone;
    apiFetch<{ items: AdvertisementListItem[]; total: number }>(
      `/advertisements?zone=${zoneParam}&take=50`,
    )
      .then((res) => setAds(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load ads'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [selectedZone, device]);

  function handleDeviceChange(next: AdDevice) {
    onDeviceChange(next);
    setSelectedZone(ALL_ZONES);
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

  return (
    <div>
      <div className="toolbar">
        {DEVICE_TABS.map((d) => (
          <button
            key={d}
            type="button"
            className={device === d ? 'btn btn-sm btn-primary' : 'btn btn-sm'}
            onClick={() => handleDeviceChange(d)}
          >
            {DEVICE_LABELS[d]}
          </button>
        ))}
      </div>

      <div className="field" style={{ maxWidth: '480px' }}>
        <label htmlFor={`zone-${page}`}>Ad Zone</label>
        <select
          id={`zone-${page}`}
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value as ZoneSelection)}
        >
          <option value={ALL_ZONES}>All {AD_PAGE_LABELS[page]} Ads ({DEVICE_LABELS[device]})</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {AD_ZONE_LABELS[z]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginTop: '1rem' }}>
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : ads.length === 0 ? (
          <p className="empty-state">No ads yet for this zone.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                {selectedZone === ALL_ZONES && <th>Zone</th>}
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
                    <Link href={`/advertisements/${a.id}?tab=${page}&device=${device}`}>{a.name}</Link>
                  </td>
                  {selectedZone === ALL_ZONES && <td>{AD_ZONE_LABELS[a.zone]}</td>}
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

      {selectedZone !== ALL_ZONES && (
        <div className="toolbar">
          <Link
            href={`/advertisements/new?zone=${selectedZone}&tab=${page}&device=${device}`}
            className="btn btn-primary"
          >
            + Add New Ad for This Zone
          </Link>
        </div>
      )}
    </div>
  );
}

function isAdPage(value: string | null): value is AdPage {
  return PAGE_TABS.includes(value as AdPage);
}

function isAdDevice(value: string | null): value is AdDevice {
  return DEVICE_TABS.includes(value as AdDevice);
}

function AdvertisementsListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const deviceParam = searchParams.get('device');

  // Which page/device tab you're on lives in the URL, not just component state - so
  // creating or editing an ad from e.g. List Page + Mobile and saving returns you to that
  // exact tab instead of resetting to the Home/Desktop defaults on remount.
  const [activeTab, setActiveTabState] = useState<AdPage | 'all'>(
    tabParam === 'all' || isAdPage(tabParam) ? tabParam : 'home',
  );
  const [device, setDeviceState] = useState<AdDevice>(isAdDevice(deviceParam) ? deviceParam : 'desktop');

  function updateUrl(nextTab: AdPage | 'all', nextDevice: AdDevice) {
    const qs = new URLSearchParams({ tab: nextTab });
    if (nextTab !== 'all') qs.set('device', nextDevice);
    router.replace(`/advertisements?${qs.toString()}`, { scroll: false });
  }

  function setActiveTab(nextTab: AdPage | 'all') {
    setActiveTabState(nextTab);
    updateUrl(nextTab, device);
  }

  function setDevice(nextDevice: AdDevice) {
    setDeviceState(nextDevice);
    updateUrl(activeTab, nextDevice);
  }

  // "All Ads" tab state - the original flat list+filter view, kept as a fallback covering
  // Roadblock (no page tab of its own) and anything not yet worth a dedicated tab.
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

  useEffect(() => {
    if (activeTab === 'all') load();
  }, [activeTab, zoneFilter, isActiveFilter, page, pageSize]);

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
        <Link
          href={`/advertisements/new?tab=${activeTab}${activeTab !== 'all' ? `&device=${device}` : ''}`}
          className="btn btn-primary"
        >
          New Advertisement
        </Link>
      </div>

      <div className="toolbar">
        {PAGE_TABS.map((p) => (
          <button
            key={p}
            type="button"
            className={activeTab === p ? 'btn btn-primary' : 'btn'}
            onClick={() => setActiveTab(p)}
          >
            {AD_PAGE_LABELS[p]}
          </button>
        ))}
        <button
          type="button"
          className={activeTab === 'all' ? 'btn btn-primary' : 'btn'}
          onClick={() => setActiveTab('all')}
        >
          All Ads
        </button>
      </div>

      {activeTab !== 'all' ? (
        <PageZoneBrowser key={activeTab} page={activeTab} device={device} onDeviceChange={setDevice} />
      ) : (
        <>
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
                        <Link href={`/advertisements/${a.id}?tab=all`}>{a.name}</Link>
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
        </>
      )}
    </div>
  );
}

export default function AdvertisementsListPage() {
  return (
    <Suspense>
      <AdvertisementsListPageInner />
    </Suspense>
  );
}
