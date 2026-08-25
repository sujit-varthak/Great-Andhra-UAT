'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import {
  Advertisement,
  AdType,
  AdZone,
  AD_ZONE_LABELS,
  AD_ZONE_DIMENSIONS,
  AD_ZONE_PAGE,
  AD_ZONE_DEVICE,
} from '@/lib/types';
import { ImageUploader } from './ImageUploader';

interface Props {
  advertisement?: Advertisement;
}

// Every zone is independently manageable per page now - each page (home, article, box
// office, list) has its own sidebar/top-banner zones instead of sharing one.
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

// Zones that share the incoming zone's page and are compatible with its device (same
// device, or either side is 'both') - used to scope the dropdown to "only zones relevant
// to where this ad is being created from" instead of every zone on the whole site.
function zonesScopedLike(reference: AdZone): AdZone[] {
  if (reference === 'ROADBLOCK') return AD_ZONES;
  const refPage = AD_ZONE_PAGE[reference];
  const refDevice = AD_ZONE_DEVICE[reference];
  return AD_ZONES.filter((z) => {
    if (z === 'ROADBLOCK') return false;
    if (AD_ZONE_PAGE[z] !== refPage) return false;
    const zDevice = AD_ZONE_DEVICE[z];
    return zDevice === refDevice || zDevice === 'both' || refDevice === 'both';
  });
}

export function AdvertisementForm({ advertisement }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = Boolean(advertisement);

  // A zone in the URL (from "Add new ad" on a page tab) pre-selects it for a new ad; ignored
  // once editing an existing ad, whose own zone always wins.
  const zoneFromUrl = searchParams.get('zone') as AdZone | null;

  // Creating a new ad from a specific page/device tab (via "+ Add New Ad for This Zone")
  // scopes the dropdown to just that page+device's zones, so you can't accidentally pick a
  // zone from an unrelated page or the wrong device. Editing an existing ad, or landing here
  // with no zone context (the plain "New Advertisement" button), keeps the full list so an
  // ad can still be moved to any zone.
  const zoneOptions: AdZone[] =
    !advertisement && zoneFromUrl && AD_ZONE_LABELS[zoneFromUrl] ? zonesScopedLike(zoneFromUrl) : AD_ZONES;

  const [name, setName] = useState(advertisement?.name ?? '');
  const [type, setType] = useState<AdType>(advertisement?.type ?? 'IMAGE');
  const [zone, setZone] = useState<AdZone>(
    advertisement?.zone ?? (zoneFromUrl && AD_ZONE_LABELS[zoneFromUrl] ? zoneFromUrl : 'HOMEPAGE_SIDEBAR_LEFT'),
  );

  // Image field - a zone is either a desktop placement or a mobile placement (never both
  // anymore), so one image is enough; it's saved as imageUrlDesktop on the backend regardless
  // of which kind of zone it is, and ga_render_ad() on the frontend already falls back to
  // imageUrlDesktop when imageUrlMobile is unset for whichever device context it's rendering.
  const [imageUrl, setImageUrl] = useState<string | null>(
    advertisement?.imageUrlDesktop ?? advertisement?.imageUrlMobile ?? null,
  );
  const [landingUrl, setLandingUrl] = useState(advertisement?.landingUrl ?? '');

  // Script field
  const [scriptCode, setScriptCode] = useState(advertisement?.scriptCode ?? '');

  // Roadblock
  const [isRoadblock, setIsRoadblock] = useState(advertisement?.isRoadblock ?? false);
  const [roadblockDelayMs, setRoadblockDelayMs] = useState(
    advertisement?.roadblockDelayMs ?? 15000,
  );
  const [roadblockCookieTTL, setRoadblockCookieTTL] = useState(
    advertisement?.roadblockCookieTTL ?? 900,
  );

  // Scheduling
  const [isActive, setIsActive] = useState(advertisement?.isActive ?? true);
  const [startDate, setStartDate] = useState(
    advertisement?.startDate ? advertisement.startDate.slice(0, 16) : new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(
    advertisement?.endDate ? advertisement.endDate.slice(0, 16) : '',
  );

  // Rotation
  const [sortOrder, setSortOrder] = useState(advertisement?.sortOrder ?? 0);

  // State
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const zoneDimensions = AD_ZONE_DIMENSIONS[zone];
  const isRoadblockZone = zone === 'ROADBLOCK';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Ad name is required');
      return;
    }

    if (type === 'IMAGE') {
      if (!imageUrl) {
        setError('An image is required');
        return;
      }
      if (!landingUrl.trim()) {
        setError('Landing URL is required for image ads');
        return;
      }
    } else if (type === 'SCRIPT') {
      if (!scriptCode.trim()) {
        setError('Script code is required');
        return;
      }
    }

    setSaving(true);

    const payload = {
      name,
      type,
      imageUrlDesktop: imageUrl || undefined,
      landingUrl: landingUrl || undefined,
      scriptCode: scriptCode || undefined,
      zone,
      // Every zone is now inherently a desktop zone or a mobile zone (there's no shared
      // dual-purpose zone left) - always true, no longer a user-editable toggle.
      showOnDesktop: true,
      showOnMobile: true,
      isRoadblock: isRoadblockZone ? true : isRoadblock,
      roadblockDelayMs: isRoadblockZone ? roadblockDelayMs : undefined,
      roadblockCookieTTL: isRoadblockZone ? roadblockCookieTTL : undefined,
      isActive,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      sortOrder,
    };

    try {
      if (isEdit && advertisement) {
        await apiFetch(`/advertisements/${advertisement.id}`, { method: 'PATCH', body: payload });
      } else {
        await apiFetch('/advertisements', { method: 'POST', body: payload });
      }
      // Returns to whichever page/device tab this ad was created or edited from (carried in
      // the URL by the list page's links) instead of always resetting to the Home/Desktop
      // defaults - see AdvertisementsListPage's tab/device <-> URL sync.
      const returnTab = searchParams.get('tab');
      const returnDevice = searchParams.get('device');
      const returnUrl = returnTab
        ? `/advertisements?tab=${returnTab}${returnTab !== 'all' && returnDevice ? `&device=${returnDevice}` : ''}`
        : '/advertisements';
      router.push(returnUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save advertisement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Basic Info */}
      <div className="card">
        <h2>{isEdit ? 'Edit Advertisement' : 'New Advertisement'}</h2>

        <div className="field">
          <label htmlFor="name">Ad Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Best Brains Q4 Campaign"
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="zone">Placement Zone</label>
            <select id="zone" value={zone} onChange={(e) => setZone(e.target.value as AdZone)}>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {AD_ZONE_LABELS[z]}
                </option>
              ))}
            </select>
            <small>
              Dimensions: {zoneDimensions.width} × {zoneDimensions.height}
            </small>
          </div>

          <div className="field">
            <label htmlFor="sortOrder">Sort Order</label>
            <input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min="0"
            />
            <small>Lower number = higher priority</small>
          </div>
        </div>
      </div>

      {/* Type & Content */}
      <div className="card">
        <h3>Ad Content</h3>

        <div className="field">
          <label>Ad Type</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={type === 'IMAGE'}
                onChange={() => setType('IMAGE')}
              />
              Image with Link
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={type === 'SCRIPT'}
                onChange={() => setType('SCRIPT')}
              />
              Embed Script
            </label>
          </div>
        </div>

        {/* IMAGE Type */}
        {type === 'IMAGE' && (
          <>
            <div>
              <ImageUploader value={imageUrl} onChange={setImageUrl} label="Image" />
            </div>

            <div className="field">
              <label htmlFor="landingUrl">Landing URL</label>
              <input
                id="landingUrl"
                type="url"
                value={landingUrl}
                onChange={(e) => setLandingUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </>
        )}

        {/* SCRIPT Type */}
        {type === 'SCRIPT' && (
          <div className="field">
            <label htmlFor="scriptCode">Script Code</label>
            <textarea
              id="scriptCode"
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              placeholder="<script>... full script tag here ...</script>"
              rows={8}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
            <small>Paste the complete &lt;script&gt;...&lt;/script&gt; tag</small>
          </div>
        )}
      </div>

      {/* Roadblock Settings */}
      {isRoadblockZone && (
        <div className="card">
          <h3>Roadblock Settings</h3>

          <div className="field-row">
            <div className="field">
              <label htmlFor="roadblockDelay">Show After (milliseconds)</label>
              <input
                id="roadblockDelay"
                type="number"
                value={roadblockDelayMs}
                onChange={(e) => setRoadblockDelayMs(Number(e.target.value))}
                min="0"
                max="60000"
                step="1000"
              />
              <small>How long to wait before showing (e.g., 15000 = 15 seconds)</small>
            </div>

            <div className="field">
              <label htmlFor="roadblockTTL">Cookie TTL (seconds)</label>
              <input
                id="roadblockTTL"
                type="number"
                value={roadblockCookieTTL}
                onChange={(e) => setRoadblockCookieTTL(Number(e.target.value))}
                min="60"
                step="60"
              />
              <small>How long before the ad shows again (e.g., 900 = 15 minutes)</small>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling */}
      <div className="card">
        <h3>Scheduling</h3>

        <div className="field-row">
          <div className="field">
            <label htmlFor="startDate">Start Date & Time</label>
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="endDate">End Date & Time (Optional)</label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <small>Leave empty to show indefinitely</small>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="toolbar" style={{ marginTop: '2rem' }}>
        <button type="button" onClick={() => router.back()} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
