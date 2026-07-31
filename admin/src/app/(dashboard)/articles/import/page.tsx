'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { ImportPreview, ImportResult } from '@/lib/types';

export default function ImportArticlesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError('');
  }

  async function handlePreview() {
    if (!file) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<ImportPreview>('/articles/import/preview', {
        method: 'POST',
        body: formData,
        isForm: true,
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to preview import');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<ImportResult>('/articles/import/commit', {
        method: 'POST',
        body: formData,
        isForm: true,
      });
      setResult(res);
      setPreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Import Articles</h1>
        <Link href="/articles" className="btn">
          Back to Articles
        </Link>
      </div>

      <div className="card">
        <p className="hint-text" style={{ marginTop: 0 }}>
          Upload a WordPress export (WXR) XML file. Articles always import as Draft for review -
          nothing goes live automatically. Matching categories are reused; new ones are created as
          top-level categories. Articles already imported before (matched by their original
          WordPress post ID) are skipped automatically.
        </p>
        <div className="field">
          <label htmlFor="xmlFile">XML file</label>
          <input
            id="xmlFile"
            type="file"
            accept=".xml,text/xml,application/xml"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={handlePreview} disabled={!file || loading}>
            {loading && !preview ? 'Reading file…' : 'Preview Import'}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {preview && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Preview</h3>
          <p>
            {preview.totalInFile} article(s) found in file — <strong>{preview.willImport}</strong>{' '}
            will be imported, {preview.duplicatesSkipped} already-imported duplicate(s) will be
            skipped.
          </p>
          {preview.newCategories.length > 0 && (
            <p>
              <strong>{preview.newCategories.length}</strong> new categor
              {preview.newCategories.length === 1 ? 'y' : 'ies'} will be created:{' '}
              {preview.newCategories.join(', ')}
            </p>
          )}
          {preview.warnings.length > 0 && (
            <div>
              <p className="hint-text">{preview.warnings.length} note(s):</p>
              <ul>
                {preview.warnings.slice(0, 20).map((w, i) => (
                  <li key={i} className="hint-text">
                    {w.title}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="toolbar">
            <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Importing…' : `Confirm Import (${preview.willImport} articles)`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Import complete</h3>
          <p>
            <strong>{result.created}</strong> article(s) created as Draft,{' '}
            {result.duplicatesSkipped} duplicate(s) skipped, {result.failed} failed.
          </p>
          {result.warnings.length > 0 && (
            <ul>
              {result.warnings.slice(0, 20).map((w, i) => (
                <li key={i} className="error-text">
                  {w.title}: {w.message}
                </li>
              ))}
            </ul>
          )}
          <Link href="/articles" className="btn btn-primary">
            View Articles
          </Link>
        </div>
      )}
    </div>
  );
}
