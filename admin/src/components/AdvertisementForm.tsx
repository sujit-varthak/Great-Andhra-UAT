'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { Advertisement, AdType, AdZone, AD_ZONE_LABELS, AD_ZONE_DIMENSIONS } from '@/lib/types';
import { ImageUploader } from './ImageUploader';

interface Props {
  advertisement?: Advertisement;
}

// HOMEPAGE_MOBILE_BANNER, INNER_SIDEBAR_LEFT/RIGHT, INNER_TOP_BANNER, INNER_MOBILE_BANNER,
// BOXOFFICE_TOP_BANNER, BOXOFFICE_MOBILE_BANNER intentionally omitted - the article page and
// box office now reuse the homepage's own sidebar/top-banner ads (same ad, same content)
// instead of being separately manageable. Not removed from AdZone/AD_ZONE_LABELS/
// AD_ZONE_DIMENSIONS in lib/types.ts, so it's a one-line change to bring any of them back.
const AD_ZONES: AdZone[] = [
  'HOMEPAGE_SIDEBAR_LEFT',
  'HOMEPAGE_SIDEBAR_RIGHT',
  'HOMEPAGE_TOP_BANNER',
  'HOMEPAGE_SECTION_INLINE',
  'HOMEPAGE_ABOVE_HEADER_BANNER',
  'HOMEPAGE_STRIP_BANNER_1',
  'HOMEPAGE_STRIP_BANNER_2',
  'HOMEPAGE_STRIP_BANNER_3',
  'HOMEPAGE_BIG_STORY_BANNER',
  'HOMEPAGE_LATEST_NEWS_INLINE_AD',
  'HOMEPAGE_OPINION_BANNER',
  'HOMEPAGE_ARTICLE_WIDGET_AD',
  'INNER_ARTICLE_BANNER',
  'INNER_ARTICLE_MIDCONTENT_AD',
  'INNER_SIDEBAR_BOTTOM_AD',
  'BOXOFFICE_SIDEBAR_LEFT',
  'BOXOFFICE_SIDEBAR_RIGHT',
  'LISTPAGE_CONTENT_AD',
  'ROADBLOCK',
];

export function AdvertisementForm({ advertisement }: Props) {
  const router = useRouter();
  const isEdit = Boolean(advertisement);

  const [name, setName] = useState(advertisement?.name ?? '');
  const [type, setType] = useState<AdType>(advertisement?.type ?? 'IMAGE');
  const [zone, setZone] = useState<AdZone>(advertisement?.zone ?? 'HOMEPAGE_SIDEBAR_LEFT');

  // Image fields
  const [imageUrlDesktop, setImageUrlDesktop] = useState<string | null>(
    advertisement?.imageUrlDesktop ?? null,
  );
  const [imageUrlMobile, setImageUrlMobile] = useState<string | null>(
    advertisement?.imageUrlMobile ?? null,
  );
  const [landingUrl, setLandingUrl] = useState(advertisement?.landingUrl ?? '');

  // Script field
  const [scriptCode, setScriptCode] = useState(advertisement?.scriptCode ?? '');

  // Visibility
  const [showOnDesktop, setShowOnDesktop] = useState(advertisement?.showOnDesktop ?? true);
  const [showOnMobile, setShowOnMobile] = useState(advertisement?.showOnMobile ?? true);

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
      if (!imageUrlDesktop && !imageUrlMobile) {
        setError('At least one image (desktop or mobile) is required');
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
      imageUrlDesktop: imageUrlDesktop || undefined,
      imageUrlMobile: imageUrlMobile || undefined,
      landingUrl: landingUrl || undefined,
      scriptCode: scriptCode || undefined,
      zone,
      showOnDesktop,
      showOnMobile,
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
      router.push('/advertisements');
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
              {AD_ZONES.map((z) => (
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
              <ImageUploader
                value={imageUrlDesktop}
                onChange={setImageUrlDesktop}
                label="Desktop Image"
              />
            </div>

            <div>
              <ImageUploader
                value={imageUrlMobile}
                onChange={setImageUrlMobile}
                label="Mobile Image"
              />
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

      {/* Visibility */}
      <div className="card">
        <h3>Visibility</h3>

        <div className="field-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOnDesktop}
              onChange={(e) => setShowOnDesktop(e.target.checked)}
            />
            Show on Desktop
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOnMobile}
              onChange={(e) => setShowOnMobile(e.target.checked)}
            />
            Show on Mobile
          </label>
        </div>
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
