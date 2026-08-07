'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { Advertisement } from '@/lib/types';
import { AdvertisementForm } from '@/components/AdvertisementForm';

export default function EditAdvertisementPage() {
  const params = useParams();
  const id = params.id as string;

  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Advertisement>(`/advertisements/${id}`)
      .then(setAd)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load advertisement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <h1>Loading…</h1>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div>
        <h1>Error</h1>
        <p className="error-text">{error || 'Advertisement not found'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Edit Advertisement</h1>
      </div>
      <Suspense>
        <AdvertisementForm advertisement={ad} />
      </Suspense>
    </div>
  );
}
