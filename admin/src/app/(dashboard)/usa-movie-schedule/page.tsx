'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { UsaMovieScheduleItem } from '@/lib/types';

export default function UsaMovieSchedulePage() {
  const [items, setItems] = useState<UsaMovieScheduleItem[]>([]);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editOpenInNewTab, setEditOpenInNewTab] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<UsaMovieScheduleItem[]>('/usa-movie-schedule')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/usa-movie-schedule', { method: 'POST', body: { title, linkUrl, openInNewTab } });
      setTitle('');
      setLinkUrl('');
      setOpenInNewTab(true);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    }
  }

  function startEdit(item: UsaMovieScheduleItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditLinkUrl(item.linkUrl);
    setEditOpenInNewTab(item.openInNewTab);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setError('');
    try {
      await apiFetch(`/usa-movie-schedule/${id}`, {
        method: 'PATCH',
        body: { title: editTitle, linkUrl: editLinkUrl, openInNewTab: editOpenInNewTab },
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function toggleActive(item: UsaMovieScheduleItem) {
    try {
      await apiFetch(`/usa-movie-schedule/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this schedule entry?')) return;
    try {
      await apiFetch(`/usa-movie-schedule/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>USA Movie Schedule</h1>
      </div>

      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="linkUrl">URL</label>
            <input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
            />{' '}
            Open in a new tab
          </label>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {loading ? (
          <p className="spinner-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No schedule entries yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>New tab</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id}>
                    <td>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </td>
                    <td>
                      <input value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)} />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={editOpenInNewTab}
                        onChange={(e) => setEditOpenInNewTab(e.target.checked)}
                      />
                    </td>
                    <td>{item.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button className="btn btn-primary" onClick={() => saveEdit(item.id)}>
                        Save
                      </button>{' '}
                      <button className="btn" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>
                      <a href={item.linkUrl} target="_blank" rel="noreferrer">
                        {item.linkUrl}
                      </a>
                    </td>
                    <td>{item.openInNewTab ? 'Yes' : 'No'}</td>
                    <td>
                      <button className="btn" onClick={() => toggleActive(item)}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <button className="btn" onClick={() => startEdit(item)}>
                        Edit
                      </button>{' '}
                      <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
