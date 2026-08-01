'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { MovieBoxOfficeItem, MovieBoxOfficeSection } from '@/lib/types';

interface Props {
  section: MovieBoxOfficeSection;
}

export function MovieBoxOfficeManager({ section }: Props) {
  const [items, setItems] = useState<MovieBoxOfficeItem[]>([]);
  const [movieName, setMovieName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMovieName, setEditMovieName] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editOpenInNewTab, setEditOpenInNewTab] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<MovieBoxOfficeItem[]>(`/movie-box-office?section=${section}`)
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [section]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/movie-box-office', {
        method: 'POST',
        body: { section, movieName, linkUrl, amount, openInNewTab },
      });
      setMovieName('');
      setLinkUrl('');
      setAmount('');
      setOpenInNewTab(true);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    }
  }

  function startEdit(item: MovieBoxOfficeItem) {
    setEditingId(item.id);
    setEditMovieName(item.movieName);
    setEditLinkUrl(item.linkUrl);
    setEditAmount(item.amount);
    setEditOpenInNewTab(item.openInNewTab);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setError('');
    try {
      await apiFetch(`/movie-box-office/${id}`, {
        method: 'PATCH',
        body: {
          movieName: editMovieName,
          linkUrl: editLinkUrl,
          amount: editAmount,
          openInNewTab: editOpenInNewTab,
        },
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function toggleActive(item: MovieBoxOfficeItem) {
    try {
      await apiFetch(`/movie-box-office/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await apiFetch(`/movie-box-office/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <div>
      <div className="card">
        <form onSubmit={handleCreate} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="movieName">Movie name</label>
            <input
              id="movieName"
              value={movieName}
              onChange={(e) => setMovieName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="boxOfficeLinkUrl">URL</label>
            <input
              id="boxOfficeLinkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              placeholder="e.g. 200+ Crores"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
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
          <p className="empty-state">No entries yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Movie</th>
                <th>Amount</th>
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
                      <input value={editMovieName} onChange={(e) => setEditMovieName(e.target.value)} />
                      <input
                        style={{ marginTop: 4 }}
                        value={editLinkUrl}
                        onChange={(e) => setEditLinkUrl(e.target.value)}
                        placeholder="URL"
                      />
                    </td>
                    <td>
                      <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
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
                    <td>
                      <a href={item.linkUrl} target="_blank" rel="noreferrer">
                        {item.movieName}
                      </a>
                    </td>
                    <td>{item.amount}</td>
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
