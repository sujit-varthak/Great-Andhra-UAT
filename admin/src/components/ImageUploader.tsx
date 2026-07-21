'use client';

import { useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface Props {
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploader({ value, onChange, label = 'Image' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ url: string }>('/media/upload', {
        method: 'POST',
        body: formData,
        isForm: true,
      });
      onChange(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          style={{ maxWidth: 200, borderRadius: 6, display: 'block', marginBottom: 8 }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {uploading && <p className="hint-text">Uploading…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
