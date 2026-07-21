'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Category } from '@/lib/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<Category[]>('/categories')
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load categories'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function parentName(id: string | null) {
    if (!id) return '—';
    return categories.find((c) => c.id === id)?.name ?? '—';
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/categories', { method: 'POST', body: { name, parentId: parentId || undefined } });
      setName('');
      setParentId('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create category');
    }
  }

  async function handleRename(cat: Category) {
    const newName = window.prompt('New name', cat.name);
    if (!newName || newName === cat.name) return;
    try {
      await apiFetch(`/categories/${cat.id}`, { method: 'PATCH', body: { name: newName } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to rename category');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete category');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="parent">Parent (optional)</label>
            <select id="parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="empty-state">No categories yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{parentName(c.parentId)}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => handleRename(c)}>
                      Rename
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(c.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
